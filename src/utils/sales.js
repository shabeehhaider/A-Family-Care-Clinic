/**
 * Sales helpers — pure functions (unit tested in tests/sales.test.js).
 */

/** Sale time in ms (createdAt ISO, falling back to the printed date + time). */
export function saleTime(sale) {
  const t = Date.parse(sale?.createdAt)
  if (!Number.isNaN(t)) return t
  const fallback = Date.parse(`${sale?.date} ${sale?.time}`)
  return Number.isNaN(fallback) ? 0 : fallback
}

export function itemCount(sale) {
  return (sale?.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
}

/** Sales whose time is within [from, to). Null bounds = unlimited. */
export function filterByRange(sales, from, to) {
  return sales.filter(sale => {
    const t = saleTime(sale)
    if (from && t < from.getTime()) return false
    if (to && t >= to.getTime()) return false
    return true
  })
}

/**
 * Aggregates sales for the summary cards and the printed day report.
 * Voided sales are counted separately and excluded from every other total.
 */
export function summarizeSales(sales = []) {
  const summary = {
    count: 0,
    subtotal: 0,
    discount: 0,
    tax: 0,
    revenue: 0,
    voidCount: 0,
    voidAmount: 0,
    voided: [],
    byPayment: [],
    byCashier: [],
    items: []
  }
  const byPayment = new Map()
  const byCashier = new Map()
  const items = new Map()

  const bump = (map, key, init, amount) => {
    if (!map.has(key)) map.set(key, { ...init, count: 0, amount: 0 })
    const row = map.get(key)
    row.count++
    row.amount += amount
  }

  for (const sale of sales) {
    const total = Number(sale.grandTotal) || 0
    if (sale.voided) {
      summary.voidCount++
      summary.voidAmount += total
      summary.voided.push(sale)
      continue
    }

    summary.count++
    summary.subtotal += Number(sale.subtotal) || 0
    summary.discount += Number(sale.discount) || 0
    summary.tax += Number(sale.tax) || 0
    summary.revenue += total

    const method = sale.paymentMethod || 'Other'
    bump(byPayment, method, { method }, total)

    const cashier = sale.cashier?.name || 'Unknown'
    bump(byCashier, cashier, { name: cashier }, total)

    for (const item of sale.items || []) {
      const key = `${item.type}:${item.name}`
      if (!items.has(key)) items.set(key, { name: item.name, type: item.type, quantity: 0, amount: 0 })
      const row = items.get(key)
      const qty = Number(item.quantity) || 0
      row.quantity += qty
      row.amount += (Number(item.price) || 0) * qty
    }
  }

  const byAmount = (a, b) => b.amount - a.amount
  summary.byPayment = [...byPayment.values()].sort(byAmount)
  summary.byCashier = [...byCashier.values()].sort(byAmount)
  summary.items = [...items.values()].sort(byAmount)
  return summary
}
