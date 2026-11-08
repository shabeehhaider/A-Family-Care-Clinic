/**
 * Medicine stock helpers — pure functions (unit tested in tests/inventory.test.js).
 *
 * A medicine's stock is tracked only when `stock` is a number. Untracked
 * medicines (stock null/undefined — e.g. items saved before stock existed)
 * can always be sold and are never adjusted.
 */
import { parseDateInputValue } from './format'

export const DEFAULT_LOW_STOCK = 10
export const EXPIRY_WARNING_DAYS = 30

export const isTracked = (medicine) =>
  typeof medicine?.stock === 'number' && Number.isFinite(medicine.stock)

/**
 * @returns {{ tracked, out, low, expired, expiringSoon, daysToExpiry }}
 */
export function stockStatus(medicine, today = new Date()) {
  const tracked = isTracked(medicine)
  const threshold = Number.isFinite(medicine?.lowStockAt) ? medicine.lowStockAt : DEFAULT_LOW_STOCK
  const out = tracked && medicine.stock <= 0
  const low = tracked && !out && medicine.stock <= threshold

  let expired = false
  let expiringSoon = false
  let daysToExpiry = null
  const expiry = parseDateInputValue(medicine?.expiry)
  if (expiry) {
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    daysToExpiry = Math.round((expiry - startOfToday) / 86400000)
    expired = daysToExpiry < 0
    expiringSoon = !expired && daysToExpiry <= EXPIRY_WARNING_DAYS
  }

  return { tracked, out, low, expired, expiringSoon, daysToExpiry }
}

/** Units that can still be added to the cart (Infinity when untracked). */
export function availableToAdd(medicine, quantityInCart = 0) {
  if (!isTracked(medicine)) return Infinity
  return Math.max(0, medicine.stock - quantityInCart)
}

/**
 * Returns a new medicines array with stock adjusted for the given sale items.
 * direction -1 = sale (deduct), +1 = void (restore). Never goes below 0.
 */
export function applyStockChange(medicines, items, direction) {
  const qtyById = new Map()
  for (const item of items || []) {
    if (item.type !== 'medicine') continue
    qtyById.set(item.id, (qtyById.get(item.id) || 0) + (Number(item.quantity) || 0))
  }
  if (qtyById.size === 0) return medicines

  return medicines.map(m => {
    if (!qtyById.has(m.id) || !isTracked(m)) return m
    return { ...m, stock: Math.max(0, m.stock + direction * qtyById.get(m.id)) }
  })
}
