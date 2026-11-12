/**
 * Postgres data store (Neon on Vercel). Same interface as FileStore.
 *
 * Tables:
 *   kv       users / catalog / counter / secret as JSON documents
 *   sales    one row per sale (month column → monthly downloads)
 *   backups  daily copies and pre-restore copies
 *
 * Every change runs in mutate(): ONE transaction holding an advisory lock, so
 * changes from different server instances happen one at a time, and a failure
 * part-way (e.g. stock check) leaves nothing half-saved.
 *
 * `db` is a small adapter: { query(text, params) → { rows }, transaction(fn) }
 * (see pgAdapter.js — node-postgres in production, PGlite in tests).
 */
import crypto from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import { monthKey, dayKey, isMonthKey, previousMonthKey, DEFAULT_TIME_ZONE } from './clock.js'
import { defaultCatalog } from './defaults.js'

const LOCK_ID = 7_301_984 // any constant; shared by all instances
const DAY_LABEL = /^\d{4}-\d{2}-\d{2}$/

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS kv (
     key text PRIMARY KEY,
     value jsonb NOT NULL,
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS sales (
     receipt_number text PRIMARY KEY,
     month text NOT NULL,
     created_at timestamptz NOT NULL,
     data jsonb NOT NULL
   )`,
  'CREATE INDEX IF NOT EXISTS sales_month_idx ON sales (month)',
  'CREATE INDEX IF NOT EXISTS sales_created_idx ON sales (created_at)',
  `CREATE TABLE IF NOT EXISTS backups (
     label text PRIMARY KEY,
     created_at timestamptz NOT NULL DEFAULT now(),
     data jsonb NOT NULL
   )`
]

const json = (value) => JSON.stringify(value)

export class PgStore {
  constructor(db, { timeZone = DEFAULT_TIME_ZONE, location = 'Postgres database' } = {}) {
    this.kind = 'database'
    this.db = db
    this.timeZone = timeZone
    this.location = location
    this.tx = new AsyncLocalStorage()
  }

  describe() {
    return this.location
  }

  /** Query on the current transaction if inside mutate(), else on the pool. */
  q(text, params = []) {
    return (this.tx.getStore() || this.db).query(text, params)
  }

  async init() {
    for (const statement of SCHEMA) await this.db.query(statement)
    await this.db.query(
      'INSERT INTO kv (key, value) VALUES ($1, $2::jsonb), ($3, $4::jsonb) ON CONFLICT (key) DO NOTHING',
      ['catalog', json(defaultCatalog()), 'users', json([])]
    )
  }

  close() {
    return this.db.close?.()
  }

  /** Runs fn inside one locked transaction. */
  mutate(fn) {
    if (this.tx.getStore()) return fn() // already inside
    return this.db.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_ID])
      return this.tx.run(client, fn)
    })
  }

  async #get(key, fallback) {
    const { rows } = await this.q('SELECT value FROM kv WHERE key = $1', [key])
    return rows.length ? rows[0].value : fallback
  }

  async #set(key, value) {
    await this.q(
      `INSERT INTO kv (key, value, updated_at) VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, json(value)]
    )
  }

  async secret() {
    await this.db.query(
      'INSERT INTO kv (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO NOTHING',
      ['secret', json(crypto.randomBytes(48).toString('hex'))]
    )
    return this.#get('secret')
  }

  // ---------- users / catalog / counter ----------
  getUsers() {
    return this.#get('users', [])
  }

  saveUsers(users) {
    return this.#set('users', users)
  }

  async getCatalog() {
    const c = await this.#get('catalog', { services: [], medicines: [] })
    return { services: c.services || [], medicines: c.medicines || [] }
  }

  saveCatalog(catalog) {
    return this.#set('catalog', catalog)
  }

  getCounter() {
    return this.#get('counter', null)
  }

  saveCounter(counter) {
    return this.#set('counter', counter)
  }

  /** RC-YYYYMMDD-NNN, sequential per day. Call inside mutate(). */
  async nextReceiptNumber(now = new Date()) {
    const today = dayKey(now, this.timeZone)
    const counter = (await this.getCounter()) || { date: today, seq: 0 }
    const seq = counter.date === today ? counter.seq + 1 : 1
    await this.saveCounter({ date: today, seq })
    return `RC-${today}-${String(seq).padStart(3, '0')}`
  }

  // ---------- sales ----------
  monthKeyOf(sale) {
    return monthKey(new Date(sale.createdAt), this.timeZone)
  }

  async #insertSale(sale, month) {
    await this.q(
      'INSERT INTO sales (receipt_number, month, created_at, data) VALUES ($1, $2, $3, $4::jsonb)',
      [sale.receiptNumber, month, sale.createdAt, json(sale)]
    )
  }

  appendSale(sale) {
    return this.#insertSale(sale, this.monthKeyOf(sale))
  }

  async getMonth(key) {
    if (!isMonthKey(key)) throw new Error(`Bad month: ${key}`)
    const { rows } = await this.q('SELECT data FROM sales WHERE month = $1 ORDER BY created_at, receipt_number', [key])
    return rows.map(r => r.data)
  }

  /** Replaces all sales of a month (restore / import). Call inside mutate(). */
  async saveMonth(key, sales) {
    if (!isMonthKey(key)) throw new Error(`Bad month: ${key}`)
    await this.q('DELETE FROM sales WHERE month = $1', [key])
    for (const sale of sales) {
      await this.q('DELETE FROM sales WHERE receipt_number = $1', [sale.receiptNumber])
      await this.#insertSale(sale, key)
    }
  }

  async listMonths() {
    const { rows } = await this.q('SELECT DISTINCT month FROM sales ORDER BY month')
    return rows.map(r => r.month)
  }

  async findSale(receiptNumber) {
    const { rows } = await this.q('SELECT data FROM sales WHERE receipt_number = $1', [receiptNumber])
    return rows.length ? rows[0].data : null
  }

  async updateSale(sale) {
    const { rows } = await this.q(
      'UPDATE sales SET data = $2::jsonb WHERE receipt_number = $1 RETURNING receipt_number',
      [sale.receiptNumber, json(sale)]
    )
    if (!rows.length) throw new Error(`Sale not found: ${sale.receiptNumber}`)
  }

  async salesInRange(from, to) {
    const { rows } = await this.q(
      `SELECT data FROM sales
       WHERE ($1::timestamptz IS NULL OR created_at >= $1)
         AND ($2::timestamptz IS NULL OR created_at < $2)
       ORDER BY created_at, receipt_number`,
      [from ? from.toISOString() : null, to ? to.toISOString() : null]
    )
    return rows.map(r => r.data)
  }

  async monthSummaries() {
    const { rows } = await this.q(
      `SELECT month,
              count(*) FILTER (WHERE NOT (data ? 'voided'))::int AS sales,
              count(*) FILTER (WHERE data ? 'voided')::int AS voided,
              coalesce(sum((data->>'grandTotal')::numeric) FILTER (WHERE NOT (data ? 'voided')), 0)::float8 AS revenue
       FROM sales GROUP BY month ORDER BY month DESC`
    )
    return rows.map(r => ({ month: r.month, sales: r.sales, voided: r.voided, revenue: Number(r.revenue) }))
  }

  // ---------- backups (stored in the database) ----------
  async snapshot(label, { allMonths = false, now = new Date() } = {}) {
    const current = monthKey(now, this.timeZone)
    const months = allMonths ? await this.listMonths() : [previousMonthKey(current), current]
    const sales = {}
    for (const key of months) {
      const list = await this.getMonth(key)
      if (list.length) sales[key] = list
    }
    const data = {
      users: await this.getUsers(),
      catalog: await this.getCatalog(),
      counter: await this.getCounter(),
      sales
    }
    await this.q(
      `INSERT INTO backups (label, data) VALUES ($1, $2::jsonb)
       ON CONFLICT (label) DO UPDATE SET data = EXCLUDED.data, created_at = now()`,
      [label, json(data)]
    )
    return `database backup "${label}"`
  }

  async lastAutoBackup() {
    const { rows } = await this.q("SELECT label FROM backups WHERE label ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' ORDER BY label DESC LIMIT 1")
    return rows[0]?.label || null
  }

  async pruneDailyBackups(cutoffLabel) {
    const { rows } = await this.q('SELECT label FROM backups')
    for (const { label } of rows) {
      if (DAY_LABEL.test(label) && label < cutoffLabel) {
        await this.q('DELETE FROM backups WHERE label = $1', [label])
      }
    }
  }
}
