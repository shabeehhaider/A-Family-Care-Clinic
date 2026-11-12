/**
 * Vercel serverless function: runs the POS server (Express) for every /api
 * request. vercel.json sends /api/* here; the built POS (dist/) is served by
 * Vercel directly.
 *
 * Needs DATABASE_URL (Neon Postgres) — Vercel's disk is temporary, so data is
 * never saved as files here.
 */
import { loadConfig } from '../server/config.js'
import { createApp } from '../server/app.js'

let ready = null

export default async function handler(req, res) {
  try {
    // Reused across requests while this instance stays warm
    ready ??= createApp({ ...loadConfig(), distDir: null })
    const { app } = await ready
    return app(req, res)
  } catch (err) {
    ready = null // retry set-up on the next request
    console.error('[api] start-up failed:', err)
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: `The POS server could not start: ${err.message}` }))
  }
}
