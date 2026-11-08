/**
 * Full-data backup & restore (JSON).
 *
 * The backup holds everything needed to rebuild the POS on another device or
 * after browser data is cleared: catalog, sales history, receipt counter and
 * users (PINs stay hashed). The in-progress cart is not included.
 */
import { STORAGE_KEYS, loadFromStorage, saveToStorage, removeFromStorage } from './storage'
import { pad2 } from './format'

export const BACKUP_APP_ID = 'afcc-pos'
export const BACKUP_VERSION = 1

const DATA_KEYS = ['services', 'medicines', 'sales', 'receiptCounter', 'users']

export function createBackup(now = new Date()) {
  const data = {}
  for (const key of DATA_KEYS) {
    data[key] = loadFromStorage(STORAGE_KEYS[key], null)
  }
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data
  }
}

export function backupFilename(now = new Date()) {
  const stamp = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}_${pad2(now.getHours())}${pad2(now.getMinutes())}`
  return `afcc-backup-${stamp}.json`
}

/**
 * Checks a parsed backup file. Pure — does not touch storage.
 * @returns {{ ok: true, summary } | { ok: false, error }}
 */
export function validateBackup(backup) {
  if (!backup || typeof backup !== 'object') {
    return { ok: false, error: 'This file is not a valid backup.' }
  }
  if (backup.app !== BACKUP_APP_ID) {
    return { ok: false, error: 'This file is not an A Family Care Clinic POS backup.' }
  }
  if (typeof backup.version !== 'number' || backup.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of the app.' }
  }
  const data = backup.data
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'The backup has no data.' }
  }
  for (const key of ['services', 'medicines', 'sales', 'users']) {
    if (data[key] !== null && data[key] !== undefined && !Array.isArray(data[key])) {
      return { ok: false, error: `The backup's "${key}" section is damaged.` }
    }
  }
  const users = data.users || []
  if (!users.some(u => u && u.role === 'admin' && u.pinHash && u.salt)) {
    return { ok: false, error: 'The backup has no admin user, so nobody could log in after restoring.' }
  }

  return {
    ok: true,
    summary: {
      exportedAt: backup.exportedAt,
      sales: (data.sales || []).length,
      services: (data.services || []).length,
      medicines: (data.medicines || []).length,
      users: users.length
    }
  }
}

/** Replaces all stored data with the backup. Call validateBackup first. */
export function restoreBackup(backup) {
  const { data } = backup
  for (const key of DATA_KEYS) {
    if (data[key] === null || data[key] === undefined) removeFromStorage(STORAGE_KEYS[key])
    else if (!saveToStorage(STORAGE_KEYS[key], data[key])) {
      throw new Error(`Could not write "${key}" (browser storage unavailable or full).`)
    }
  }
  removeFromStorage(STORAGE_KEYS.draft)
}

export function markBackupDone(now = new Date()) {
  saveToStorage(STORAGE_KEYS.lastBackupAt, now.toISOString())
}

export function lastBackupAt() {
  return loadFromStorage(STORAGE_KEYS.lastBackupAt, null)
}
