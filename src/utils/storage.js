/**
 * Small localStorage wrapper — now only for this browser's own conveniences:
 * the in-progress cart (so a refresh doesn't lose it) and reading data left
 * by the old browser-only version for import. All real data is on the server.
 *
 * - Keys are namespaced with "afcc."
 * - Never throws: storage can be unavailable (private mode, blocked site data).
 */

const PREFIX = 'afcc.'

export const STORAGE_KEYS = {
  draft: 'draft',
  // written by the old browser-only version; read once for import
  services: 'services',
  medicines: 'medicines',
  sales: 'sales',
  receiptCounter: 'receiptCounter'
}

export function loadFromStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch (err) {
    console.warn(`[storage] Could not read "${key}"`, err)
    return fallback
  }
}

export function saveToStorage(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch (err) {
    console.error(`[storage] Could not save "${key}"`, err)
    return false
  }
}

export function removeFromStorage(key) {
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}
