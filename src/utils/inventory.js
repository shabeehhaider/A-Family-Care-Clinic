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

/** Single most important state, for labels and sorting. */
export function statusKey(status) {
  if (status.expired) return 'expired'
  if (status.out) return 'out'
  if (status.low) return 'low'
  if (status.expiringSoon) return 'expiring'
  if (!status.tracked) return 'unset'
  return 'ok'
}

export const STATUS_LABELS = {
  expired: 'Expired',
  out: 'Out of stock',
  low: 'Low stock',
  expiring: 'Expiring soon',
  unset: 'Stock not set',
  ok: 'In stock'
}

/** Most urgent first — used to sort by status. */
export const STATUS_ORDER = ['expired', 'out', 'low', 'expiring', 'unset', 'ok']

export const needsAttention = (s) => s.out || s.low || s.expired || s.expiringSoon

/** Counts for the inventory summary cards. */
export function summarizeInventory(medicines = [], today = new Date()) {
  const summary = { total: 0, out: 0, low: 0, expiring: 0, unset: 0, attention: 0 }
  for (const m of medicines) {
    const s = stockStatus(m, today)
    summary.total++
    if (s.out) summary.out++
    if (s.low) summary.low++
    if (s.expired || s.expiringSoon) summary.expiring++
    if (!s.tracked) summary.unset++
    if (needsAttention(s)) summary.attention++
  }
  return summary
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
