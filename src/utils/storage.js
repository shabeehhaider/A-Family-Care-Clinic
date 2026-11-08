/**
 * Small localStorage wrapper.
 *
 * - All keys are namespaced with "afcc." (A Family Care Clinic)
 * - Values are stored as JSON
 * - Never throws: storage can be unavailable (private mode, blocked site data)
 *   or full, so reads fall back to a default and writes report success/failure.
 */

const PREFIX = 'afcc.'

export const STORAGE_KEYS = {
  services: 'services',
  medicines: 'medicines',
  sales: 'sales',
  receiptCounter: 'receiptCounter',
  draft: 'draft',
  users: 'users',
  lastBackupAt: 'lastBackupAt'
}

/** Per-tab login session (sessionStorage: closing the browser logs out). */
const SESSION_KEY = PREFIX + 'session'

export function loadSession() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function saveSession(userId) {
  try {
    if (userId) window.sessionStorage.setItem(SESSION_KEY, userId)
    else window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
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

/** All saved sales (array, oldest first as recorded). */
export function loadSales() {
  const sales = loadFromStorage(STORAGE_KEYS.sales, [])
  return Array.isArray(sales) ? sales : []
}

export function saveSales(sales) {
  return saveToStorage(STORAGE_KEYS.sales, sales)
}

/** Local (not UTC) date as YYYYMMDD — UTC would roll over at 5am in Pakistan. */
export function localDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/**
 * Returns the next sequential receipt number for today, e.g. RC-20261108-001.
 * The counter resets each day and is persisted so numbers never repeat.
 */
export function nextReceiptNumber() {
  const today = localDateKey()
  const counter = loadFromStorage(STORAGE_KEYS.receiptCounter, { date: today, seq: 0 })
  const seq = counter.date === today ? counter.seq + 1 : 1
  saveToStorage(STORAGE_KEYS.receiptCounter, { date: today, seq })
  return `RC-${today}-${String(seq).padStart(3, '0')}`
}
