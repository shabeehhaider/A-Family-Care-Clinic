/**
 * Catalog item validation — shared by the browser and the server.
 */
import { DEFAULT_LOW_STOCK } from './inventory.js'

/** Keep only known fields with sane types. */
export function normaliseItem(type, data = {}) {
  const item = {
    name: String(data.name ?? '').trim(),
    price: Number(data.price) || 0
  }
  if (type === 'medicine') {
    item.stock = data.stock === '' || data.stock === null || data.stock === undefined
      ? null
      : Math.max(0, Math.floor(Number(data.stock)) || 0)
    item.lowStockAt = data.lowStockAt !== '' && data.lowStockAt !== null && data.lowStockAt !== undefined &&
      Number.isFinite(Number(data.lowStockAt))
      ? Math.max(0, Math.floor(Number(data.lowStockAt)))
      : DEFAULT_LOW_STOCK
    item.expiry = /^\d{4}-\d{2}-\d{2}$/.test(data.expiry || '') ? data.expiry : ''
  }
  return item
}

/** '' when valid, otherwise a message. */
export function validateItem(item) {
  if (!item.name) return 'Name is required.'
  if (item.name.length > 120) return 'Name is too long.'
  if (!(item.price > 0)) return 'Price must be greater than 0.'
  return ''
}

export const isCatalogType = (type) => type === 'service' || type === 'medicine'
