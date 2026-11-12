/**
 * File-based data store (for running on a clinic PC / local machine).
 *
 *   DATA_DIR/
 *     users.json            staff (PINs hashed)
 *     catalog.json          { services, medicines }
 *     counter.json          receipt counter { date, seq }
 *     sales/2026-11.json    one file per month — never deleted
 *     backups/…             automatic copies
 *     secret.key            login-token signing key
 *
 * All changes go through `mutate()`, which runs them one at a time.
 * Same interface as PgStore.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { readJson, writeJsonAtomic, exists, createQueue } from './files.js'
import { monthKey, dayKey, isMonthKey, monthFromReceipt, previousMonthKey, DEFAULT_TIME_ZONE } from './clock.js'
import { defaultCatalog } from './defaults.js'

const DAY_LABEL = /^\d{4}-\d{2}-\d{2}$/

export class FileStore {
  constructor(dataDir, { timeZone = DEFAULT_TIME_ZONE } = {}) {
    this.kind = 'file'
    this.dir = dataDir
    this.timeZone = timeZone
    this.salesDir = path.join(dataDir, 'sales')
    this.backupsDir = path.join(dataDir, 'backups')
    this.mutate = createQueue()
  }

  describe() {
    return this.dir
  }

  file(name) {
    return path.join(this.dir, name)
  }

  async init() {
    await fs.mkdir(this.salesDir, { recursive: true })
    if (!(await exists(this.file('catalog.json')))) await writeJsonAtomic(this.file('catalog.json'), defaultCatalog())
    if (!(await exists(this.file('users.json')))) await writeJsonAtomic(this.file('users.json'), [])
  }

  async close() {}

  /** Login-token key: generated once, kept with the data so logins survive restarts. */
  async secret() {
    const file = this.file('secret.key')
    try {
      return (await fs.readFile(file, 'utf8')).trim()
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
      await fs.writeFile(file, crypto.randomBytes(48).toString('hex'), { encoding: 'utf8', flag: 'wx' }).catch(() => {})
      return (await fs.readFile(file, 'utf8')).trim()
    }
  }

  // ---------- users / catalog / counter ----------
  getUsers() {
    return readJson(this.file('users.json'), [])
  }

  saveUsers(users) {
    return writeJsonAtomic(this.file('users.json'), users)
  }

  async getCatalog() {
    const c = await readJson(this.file('catalog.json'), { services: [], medicines: [] })
    return { services: c.services || [], medicines: c.medicines || [] }
  }

  saveCatalog(catalog) {
    return writeJsonAtomic(this.file('catalog.json'), catalog)
  }

  getCounter() {
    return readJson(this.file('counter.json'), null)
  }

  saveCounter(counter) {
    return writeJsonAtomic(this.file('counter.json'), counter)
  }

  /** RC-YYYYMMDD-NNN, sequential per day. Call inside mutate(). */
  async nextReceiptNumber(now = new Date()) {
    const today = dayKey(now, this.timeZone)
    const counter = (await this.getCounter()) || { date: today, seq: 0 }
    const seq = counter.date === today ? counter.seq + 1 : 1
    await this.saveCounter({ date: today, seq })
    return `RC-${today}-${String(seq).padStart(3, '0')}`
  }

  // ---------- sales (monthly files) ----------
  monthKeyOf(sale) {
    return monthKey(new Date(sale.createdAt), this.timeZone)
  }

  monthFile(key) {
    if (!isMonthKey(key)) throw new Error(`Bad month: ${key}`)
    return path.join(this.salesDir, `${key}.json`)
  }

  getMonth(key) {
    return readJson(this.monthFile(key), [])
  }

  saveMonth(key, sales) {
    return writeJsonAtomic(this.monthFile(key), sales)
  }

  async listMonths() {
    const names = await fs.readdir(this.salesDir).catch(() => [])
    return names.map(n => n.replace(/\.json$/, '')).filter(isMonthKey).sort()
  }

  /** Call inside mutate(). */
  async appendSale(sale) {
    const key = this.monthKeyOf(sale)
    const sales = await this.getMonth(key)
    sales.push(sale)
    await this.saveMonth(key, sales)
  }

  async findSale(receiptNumber) {
    const guess = monthFromReceipt(receiptNumber)
    const all = await this.listMonths()
    const months = guess && all.includes(guess) ? [guess, ...all.filter(m => m !== guess)] : all
    for (const key of months) {
      const sale = (await this.getMonth(key)).find(s => s.receiptNumber === receiptNumber)
      if (sale) return sale
    }
    return null
  }

  /** Replaces a stored sale (same receipt number). Call inside mutate(). */
  async updateSale(sale) {
    for (const key of await this.listMonths()) {
      const sales = await this.getMonth(key)
      const i = sales.findIndex(s => s.receiptNumber === sale.receiptNumber)
      if (i !== -1) {
        sales[i] = sale
        await this.saveMonth(key, sales)
        return
      }
    }
    throw new Error(`Sale not found: ${sale.receiptNumber}`)
  }

  /** Sales with createdAt in [from, to). Only reads the months involved. */
  async salesInRange(from, to) {
    const fromKey = from ? monthKey(from, this.timeZone) : null
    const toKey = to ? monthKey(new Date(to.getTime() - 1), this.timeZone) : null
    const result = []
    for (const key of await this.listMonths()) {
      if ((fromKey && key < fromKey) || (toKey && key > toKey)) continue
      for (const sale of await this.getMonth(key)) {
        const t = Date.parse(sale.createdAt)
        if (from && t < from.getTime()) continue
        if (to && t >= to.getTime()) continue
        result.push(sale)
      }
    }
    return result
  }

  async monthSummaries() {
    const out = []
    for (const key of await this.listMonths()) {
      const sales = await this.getMonth(key)
      const done = sales.filter(s => !s.voided)
      out.push({
        month: key,
        sales: done.length,
        voided: sales.length - done.length,
        revenue: done.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0)
      })
    }
    return out.reverse() // newest first
  }

  // ---------- backups ----------
  async #copy(from, to) {
    try {
      await fs.mkdir(path.dirname(to), { recursive: true })
      await fs.copyFile(from, to)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
  }

  /** Copies data into backups/<label>/ (current + previous month unless allMonths). */
  async snapshot(label, { allMonths = false, now = new Date() } = {}) {
    const target = path.join(this.backupsDir, label)
    for (const name of ['users.json', 'catalog.json', 'counter.json']) {
      await this.#copy(this.file(name), path.join(target, name))
    }
    const current = monthKey(now, this.timeZone)
    const months = allMonths ? await this.listMonths() : [previousMonthKey(current), current]
    for (const key of months) {
      await this.#copy(this.monthFile(key), path.join(target, 'sales', `${key}.json`))
    }
    return path.relative(this.dir, target)
  }

  async lastAutoBackup() {
    const names = (await fs.readdir(this.backupsDir).catch(() => [])).filter(n => DAY_LABEL.test(n)).sort()
    return names.at(-1) || null
  }

  /** Removes daily copies (labelled YYYY-MM-DD) older than `cutoffLabel`. */
  async pruneDailyBackups(cutoffLabel) {
    for (const name of await fs.readdir(this.backupsDir).catch(() => [])) {
      if (DAY_LABEL.test(name) && name < cutoffLabel) {
        await fs.rm(path.join(this.backupsDir, name), { recursive: true, force: true })
      }
    }
  }
}
