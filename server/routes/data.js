import { Router } from 'express'
import { HttpError } from '../auth.js'
import { isMonthKey } from '../store/clock.js'
import { exportAll, restoreAll, importBrowserData } from '../backup.js'

/** /api/data — monthly files, backups, import (admin only) */
export default function dataRoutes({ store, auth, config }) {
  const r = Router()
  r.use(auth.requireAuth, auth.requireAdmin)

  r.get('/info', async (_req, res) => {
    res.json({
      storage: store.kind, // 'file' | 'database'
      location: store.describe(),
      lastAutoBackup: await store.lastAutoBackup(),
      backupKeepDays: config.backupKeepDays
    })
  })

  // Monthly data files with a quick summary
  r.get('/months', async (_req, res) => {
    res.json(await store.monthSummaries()) // newest first
  })

  // Download one month's file as it is stored
  r.get('/months/:month', async (req, res) => {
    const { month } = req.params
    if (!isMonthKey(month)) throw new HttpError(400, 'Invalid month.')
    const sales = await store.getMonth(month)
    res.attachment(`sales-${month}.json`)
    res.json(sales)
  })

  r.get('/backup', async (_req, res) => {
    const backup = await exportAll(store)
    res.attachment(`afcc-server-backup-${backup.exportedAt.slice(0, 10)}.json`)
    res.json(backup)
  })

  // Manual backup copy on the server right now
  r.post('/backup/now', async (_req, res) => {
    const where = await store.mutate(() => store.snapshot(`manual-${Date.now()}`, { allMonths: true }))
    res.json({ ok: true, where })
  })

  r.post('/restore', async (req, res) => {
    res.json(await restoreAll(store, req.body))
  })

  r.post('/import-browser', async (req, res) => {
    const { backup, replaceCatalog } = req.body || {}
    res.json(await importBrowserData(store, backup, { replaceCatalog: replaceCatalog !== false }))
  })

  return r
}
