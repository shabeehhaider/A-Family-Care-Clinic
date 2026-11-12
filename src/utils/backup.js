/**
 * Data saved by the old browser-only version (localStorage), so it can be
 * imported into the server once. Also understands backup files that the old
 * version downloaded ("afcc-pos" format).
 */
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from './storage.js'

export const BROWSER_BACKUP_APP = 'afcc-pos'
export const SERVER_BACKUP_APP = 'afcc-pos-server'

/** Old-format backup built from this browser's localStorage. */
export function readBrowserData(now = new Date()) {
  const sales = loadFromStorage(STORAGE_KEYS.sales, [])
  return {
    app: BROWSER_BACKUP_APP,
    version: 1,
    exportedAt: now.toISOString(),
    data: {
      services: loadFromStorage(STORAGE_KEYS.services, null),
      medicines: loadFromStorage(STORAGE_KEYS.medicines, null),
      sales: Array.isArray(sales) ? sales : [],
      receiptCounter: loadFromStorage(STORAGE_KEYS.receiptCounter, null)
    }
  }
}

/** Counts shown before importing. */
export function summarizeBrowserBackup(backup) {
  const d = backup?.data || {}
  return {
    sales: Array.isArray(d.sales) ? d.sales.length : 0,
    services: Array.isArray(d.services) ? d.services.length : 0,
    medicines: Array.isArray(d.medicines) ? d.medicines.length : 0
  }
}

/** True when this browser still holds data from the old version. */
export function hasBrowserData() {
  const s = summarizeBrowserBackup(readBrowserData())
  return s.sales > 0 || s.medicines > 0 || s.services > 0
}

const IMPORTED_KEY = 'importedToServerAt'

export const markImported = (now = new Date()) => saveToStorage(IMPORTED_KEY, now.toISOString())
export const importedAt = () => loadFromStorage(IMPORTED_KEY, null)

/** What kind of backup file is this? 'server' | 'browser' | null */
export function backupKind(parsed) {
  if (parsed?.app === SERVER_BACKUP_APP) return 'server'
  if (parsed?.app === BROWSER_BACKUP_APP) return 'browser'
  return null
}

/** Counts shown before restoring a server backup. */
export function summarizeServerBackup(backup) {
  const d = backup?.data || {}
  const months = d.sales && typeof d.sales === 'object' ? Object.values(d.sales) : []
  return {
    exportedAt: backup?.exportedAt,
    months: months.length,
    sales: months.reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0),
    services: d.catalog?.services?.length || 0,
    medicines: d.catalog?.medicines?.length || 0,
    users: Array.isArray(d.users) ? d.users.length : 0
  }
}
