/**
 * Backups — work with either store (files or database).
 *
 * Automatic: once a day a copy of staff, catalog, counter and the current +
 * previous month's sales is saved (files: DATA_DIR/backups/YYYY-MM-DD/,
 * database: the `backups` table). Daily copies older than BACKUP_KEEP_DAYS
 * are removed. Sales themselves are never deleted. A full copy is also made
 * before any restore or import.
 *
 * Manual: full export / restore as one JSON file, and import of data saved by
 * the old browser-only version (localStorage).
 */
import { isMonthKey, dayStamp } from './store/clock.js'
import { HttpError } from './auth.js'

export const SERVER_BACKUP_APP = 'afcc-pos-server'
const BROWSER_BACKUP_APP = 'afcc-pos'

export async function dailyBackup(store, keepDays, now = new Date()) {
  const label = dayStamp(now, store.timeZone)
  await store.mutate(() => store.snapshot(label, { now }))
  const cutoff = dayStamp(new Date(now.getTime() - keepDays * 86400000), store.timeZone)
  await store.mutate(() => store.pruneDailyBackups(cutoff))
  return label
}

/** Long-running server only (not Vercel): starts the daily schedule. */
export function scheduleBackups(store, keepDays, log = console) {
  const run = () => dailyBackup(store, keepDays).catch(err => log.error('[backup] failed:', err.message))
  run()
  const timer = setInterval(run, 6 * 60 * 60 * 1000) // checks 4× a day; one copy per day
  timer.unref?.()
  return () => clearInterval(timer)
}

// ---------- full export / restore ----------
export async function exportAll(store) {
  const sales = {}
  for (const key of await store.listMonths()) sales[key] = await store.getMonth(key)
  return {
    app: SERVER_BACKUP_APP,
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      users: await store.getUsers(),
      catalog: await store.getCatalog(),
      counter: await store.getCounter(),
      sales
    }
  }
}

function validateServerBackup(backup) {
  if (backup?.app !== SERVER_BACKUP_APP || typeof backup.version !== 'number') {
    throw new HttpError(400, 'This file is not a POS server backup.')
  }
  if (backup.version > 1) throw new HttpError(400, 'This backup was made by a newer version.')
  const d = backup.data || {}
  if (!Array.isArray(d.users) || !d.users.some(u => u.role === 'admin' && u.pinHash && u.salt)) {
    throw new HttpError(400, 'The backup has no admin user, so nobody could log in after restoring.')
  }
  if (!d.catalog || !Array.isArray(d.catalog.services) || !Array.isArray(d.catalog.medicines)) {
    throw new HttpError(400, "The backup's catalog is damaged.")
  }
  if (!d.sales || typeof d.sales !== 'object') throw new HttpError(400, "The backup's sales are damaged.")
  for (const [key, list] of Object.entries(d.sales)) {
    if (!isMonthKey(key) || !Array.isArray(list)) throw new HttpError(400, `The backup's sales for ${key} are damaged.`)
  }
}

/** Replaces everything with the backup (after a full safety copy). */
export async function restoreAll(store, backup) {
  validateServerBackup(backup)
  return store.mutate(async () => {
    const safetyCopy = await store.snapshot(`pre-restore-${Date.now()}`, { allMonths: true })
    const { users, catalog, counter, sales } = backup.data
    await store.saveUsers(users)
    await store.saveCatalog(catalog)
    if (counter) await store.saveCounter(counter)
    // Months in the backup replace ours; months only on the server are kept
    for (const [key, list] of Object.entries(sales)) await store.saveMonth(key, list)
    return { safetyCopy }
  })
}

/**
 * Imports data saved by the old browser-only version. Sales are merged
 * (receipts already on the server are skipped); the catalog is replaced when
 * `replaceCatalog` is true. Users are not imported — create them on the server.
 */
export async function importBrowserData(store, backup, { replaceCatalog = true } = {}) {
  if (backup?.app !== BROWSER_BACKUP_APP || !backup.data) {
    throw new HttpError(400, 'This is not data from the browser version of the POS.')
  }
  const { services, medicines, sales, receiptCounter } = backup.data
  return store.mutate(async () => {
    await store.snapshot(`pre-import-${Date.now()}`, { allMonths: true })

    let imported = 0
    let skipped = 0
    for (const sale of Array.isArray(sales) ? sales : []) {
      if (!sale?.receiptNumber || Number.isNaN(Date.parse(sale?.createdAt))) {
        skipped++
        continue
      }
      if (await store.findSale(sale.receiptNumber)) {
        skipped++
        continue
      }
      await store.appendSale(sale)
      imported++
    }

    let catalogReplaced = false
    if (replaceCatalog && Array.isArray(services) && Array.isArray(medicines)) {
      await store.saveCatalog({ services, medicines })
      catalogReplaced = true
    }

    // keep receipt numbers moving forward
    const current = await store.getCounter()
    if (receiptCounter?.date && (!current || receiptCounter.date > current.date ||
        (receiptCounter.date === current.date && receiptCounter.seq > current.seq))) {
      await store.saveCounter(receiptCounter)
    }

    return { imported, skipped, catalogReplaced }
  })
}
