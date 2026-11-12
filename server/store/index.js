import { FileStore } from './fileStore.js'
import { PgStore } from './pgStore.js'
import { nodePgAdapter } from './pgAdapter.js'

/**
 * Picks the data store:
 *  - DATABASE_URL set (Vercel + Neon) → Postgres
 *  - otherwise → files in DATA_DIR (clinic PC / local)
 */
export function createStore(config) {
  if (config.databaseUrl) {
    const host = (() => {
      try {
        return new URL(config.databaseUrl).hostname
      } catch {
        return 'database'
      }
    })()
    return new PgStore(nodePgAdapter(config.databaseUrl), {
      timeZone: config.timeZone,
      location: `Postgres database (${host})`
    })
  }
  if (config.onVercel) {
    // Vercel's disk is temporary: saving files there would lose data
    throw new Error('DATABASE_URL is not set. On Vercel the POS needs a database — see README "Deploying to Vercel".')
  }
  return new FileStore(config.dataDir, { timeZone: config.timeZone })
}
