/**
 * A Family Care Clinic — POS server.
 *
 *   npm run server   (API only, used together with `npm run dev`)
 *   npm start        (after `npm run build`: API + the POS at http://localhost:3001)
 */
import { loadConfig } from './config.js'
import { createApp } from './app.js'
import { scheduleBackups } from './backup.js'

const config = loadConfig()

try {
  const { app, store } = await createApp(config)
  scheduleBackups(store, config.backupKeepDays)

  app.listen(config.port, config.host, () => {
    console.log(`POS server running at http://${config.host}:${config.port}`)
    console.log(`Data saved in: ${store.describe()}`)
  })
} catch (err) {
  console.error('Could not start the POS server:', err.message)
  process.exit(1)
}
