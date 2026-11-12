import express from 'express'
import path from 'node:path'
import { createStore } from './store/index.js'
import { createAuth, HttpError } from './auth.js'
import { dailyBackup } from './backup.js'
import { exists } from './store/files.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import catalogRoutes from './routes/catalog.js'
import salesRoutes from './routes/sales.js'
import dataRoutes from './routes/data.js'

/**
 * Builds the Express app (separate from listen() so tests and the Vercel
 * function can use it).
 * @param config  from loadConfig()
 * @param options.store  use this store instead of creating one (tests)
 * @returns {Promise<{ app, store }>}
 */
export async function createApp(config, { store = createStore(config) } = {}) {
  await store.init()
  const secret = config.jwtSecret || (await store.secret())
  const auth = createAuth({ store, secret, tokenTtl: config.tokenTtl })
  const ctx = { store, auth, config }

  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '50mb' })) // backups can be large

  app.get('/api/health', (_req, res) => res.json({ ok: true, storage: store.kind }))

  // Daily backup, called by Vercel Cron (sends "Authorization: Bearer <CRON_SECRET>")
  app.get('/api/cron/daily-backup', async (req, res) => {
    if (!config.cronSecret || req.get('authorization') !== `Bearer ${config.cronSecret}`) {
      throw new HttpError(401, 'Not allowed.')
    }
    res.json({ ok: true, backup: await dailyBackup(store, config.backupKeepDays) })
  })
  app.use('/api/auth', authRoutes(ctx))
  app.use('/api/users', userRoutes(ctx))
  app.use('/api/catalog', catalogRoutes(ctx))
  app.use('/api/sales', salesRoutes(ctx))
  app.use('/api/data', dataRoutes(ctx))
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found.')))

  // Production: serve the built POS (npm run build) from the same server
  if (config.distDir && (await exists(path.join(config.distDir, 'index.html')))) {
    app.use(express.static(config.distDir, { index: false }))
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next()
      res.sendFile(path.join(config.distDir, 'index.html'))
    })
  }

  // Errors → { error: message }
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'File is too large.' })
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' })
    console.error('[server]', err)
    res.status(500).json({ error: 'Server error. The data was not changed.' })
  })

  return { app, store }
}
