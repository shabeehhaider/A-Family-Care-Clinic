/**
 * Adapters giving PgStore one small interface:
 *   query(text, params) → { rows }
 *   transaction(async (client) => …) — BEGIN / COMMIT, ROLLBACK on error
 *   close()
 */
import pg from 'pg'

/** node-postgres pool (production: Neon on Vercel). */
export function nodePgAdapter(connectionString) {
  const pool = new pg.Pool({
    connectionString,
    max: 3, // serverless: keep connections few (Neon's pooled URL handles the rest)
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000
  })
  return {
    query: (text, params) => pool.query(text, params),
    async transaction(fn) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const result = await fn(client)
        await client.query('COMMIT')
        return result
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        throw err
      } finally {
        client.release()
      }
    },
    close: () => pool.end()
  }
}

/** PGlite (in-memory Postgres) — used by the tests. */
export function pgliteAdapter(pglite) {
  return {
    query: (text, params) => pglite.query(text, params),
    transaction: (fn) => pglite.transaction(tx => fn(tx)),
    close: () => pglite.close()
  }
}
