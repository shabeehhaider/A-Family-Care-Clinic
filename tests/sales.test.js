import { describe, it, expect } from 'vitest'
import { saleTime, itemCount, filterByRange, summarizeSales } from '../src/utils/sales'

const mk = (n, overrides = {}) => ({
  receiptNumber: `RC-${n}`,
  createdAt: new Date(2026, 10, 8, 10, n).toISOString(),
  cashier: { name: 'Sara' },
  items: [{ id: 'm1', name: 'Paracetamol', type: 'medicine', price: 50, quantity: 2 }],
  subtotal: 100,
  discount: 10,
  tax: 0,
  grandTotal: 90,
  paymentMethod: 'Cash',
  ...overrides
})

describe('saleTime', () => {
  it('uses createdAt', () => {
    const s = mk(1)
    expect(saleTime(s)).toBe(Date.parse(s.createdAt))
  })

  it('falls back to date + time, then 0', () => {
    expect(saleTime({ date: 'Nov 8, 2026', time: '06:18 PM' })).toBe(Date.parse('Nov 8, 2026 06:18 PM'))
    expect(saleTime({})).toBe(0)
  })
})

describe('itemCount', () => {
  it('sums quantities', () => {
    expect(itemCount({ items: [{ quantity: 2 }, { quantity: 3 }] })).toBe(5)
    expect(itemCount({})).toBe(0)
  })
})

describe('filterByRange', () => {
  it('keeps sales in [from, to)', () => {
    const sales = [mk(1), mk(2, { createdAt: new Date(2026, 10, 9, 0, 0).toISOString() })]
    const from = new Date(2026, 10, 8)
    const to = new Date(2026, 10, 9)
    expect(filterByRange(sales, from, to).map(s => s.receiptNumber)).toEqual(['RC-1'])
  })
})

describe('summarizeSales', () => {
  it('totals completed sales and excludes voids', () => {
    const sales = [
      mk(1),
      mk(2, { paymentMethod: 'Card', cashier: { name: 'Ali' }, grandTotal: 200, subtotal: 200, discount: 0 }),
      mk(3, { voided: { reason: 'oops' }, grandTotal: 999 })
    ]
    const s = summarizeSales(sales)
    expect(s.count).toBe(2)
    expect(s.revenue).toBe(290)
    expect(s.subtotal).toBe(300)
    expect(s.discount).toBe(10)
    expect(s.voidCount).toBe(1)
    expect(s.voidAmount).toBe(999)
    expect(s.voided.map(v => v.receiptNumber)).toEqual(['RC-3'])
  })

  it('groups by payment method and cashier, largest first', () => {
    const s = summarizeSales([
      mk(1),
      mk(2),
      mk(3, { paymentMethod: 'Card', cashier: { name: 'Ali' }, grandTotal: 500 })
    ])
    expect(s.byPayment).toEqual([
      { method: 'Card', count: 1, amount: 500 },
      { method: 'Cash', count: 2, amount: 180 }
    ])
    expect(s.byCashier[0]).toEqual({ name: 'Ali', count: 1, amount: 500 })
  })

  it('aggregates items sold across sales', () => {
    const s = summarizeSales([mk(1), mk(2)])
    expect(s.items).toEqual([{ name: 'Paracetamol', type: 'medicine', quantity: 4, amount: 200 }])
  })

  it('labels sales without a cashier as Unknown', () => {
    const s = summarizeSales([mk(1, { cashier: undefined })])
    expect(s.byCashier[0].name).toBe('Unknown')
  })
})
