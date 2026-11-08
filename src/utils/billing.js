/**
 * Billing math — pure functions (unit tested in tests/billing.test.js).
 *
 * Order of operations:
 *   subtotal = Σ price × quantity
 *   discount = flat amount (capped at subtotal) or % of subtotal (capped at 100%), rounded
 *   tax      = % of (subtotal − discount), rounded; 0 when tax is disabled
 *   total    = subtotal − discount + tax
 */

const toNumber = (n) => {
  const v = Number(n)
  return Number.isFinite(v) ? v : 0
}

export function calcSubtotal(items = []) {
  return items.reduce((sum, item) => sum + toNumber(item.price) * toNumber(item.quantity), 0)
}

export function calcDiscount(subtotal, discountType, discountValue) {
  const value = toNumber(discountValue)
  if (value <= 0 || subtotal <= 0) return 0
  if (discountType === 'percentage') {
    return Math.round((subtotal * Math.min(value, 100)) / 100)
  }
  return Math.min(value, subtotal)
}

export function calcTax(taxableAmount, enableTax, taxRate) {
  const rate = toNumber(taxRate)
  if (!enableTax || rate <= 0 || taxableAmount <= 0) return 0
  return Math.round((taxableAmount * rate) / 100)
}

export function calcTotals({ items = [], discountType = 'flat', discountValue = 0, enableTax = false, taxRate = 0 } = {}) {
  const subtotal = calcSubtotal(items)
  const discount = calcDiscount(subtotal, discountType, discountValue)
  const tax = calcTax(subtotal - discount, enableTax, taxRate)
  return {
    subtotal,
    discount,
    tax,
    total: subtotal - discount + tax
  }
}

export function countUnits(items = []) {
  return items.reduce((sum, item) => sum + toNumber(item.quantity), 0)
}
