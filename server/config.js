import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Server settings (environment variables, all optional):
 *
 *   DATABASE_URL      Postgres connection (Neon on Vercel). When set, data is
 *                     saved in the database; otherwise in files under DATA_DIR.
 *                     (POSTGRES_URL is also accepted.)
 *   DATA_DIR          ./server-data — file storage folder (local / clinic PC)
 *   PORT              3001
 *   HOST              localhost   — 0.0.0.0 to allow other devices on the network
 *   APP_TIMEZONE      Asia/Karachi — dates, receipt numbers and months use this
 *   JWT_SECRET        (generated once and saved with the data)
 *   TOKEN_TTL         12h         — how long a login lasts
 *   BACKUP_KEEP_DAYS  90 for files, 30 for the database (free-tier storage)
 *   CRON_SECRET       protects the daily-backup URL (set automatically by Vercel Cron)
 */
export function loadConfig(env = process.env) {
  const databaseUrl = env.DATABASE_URL || env.POSTGRES_URL || null
  return {
    port: Number(env.PORT) || 3001,
    host: env.HOST || 'localhost',
    databaseUrl,
    onVercel: !!env.VERCEL,
    dataDir: path.resolve(env.DATA_DIR || path.join(PROJECT_ROOT, 'server-data')),
    distDir: path.join(PROJECT_ROOT, 'dist'),
    timeZone: env.APP_TIMEZONE || 'Asia/Karachi',
    jwtSecret: env.JWT_SECRET || null,
    tokenTtl: env.TOKEN_TTL || '12h',
    backupKeepDays: Number(env.BACKUP_KEEP_DAYS) || (databaseUrl ? 30 : 90),
    cronSecret: env.CRON_SECRET || null
  }
}
