import { describe, it, expect } from 'vitest'
import { calcSubtotal, calcDiscount, calcTax, calcTotals, countUnits } from '../src/utils/billing'

const items = [
  { price: 500, quantity: 1 }, // consultation
  { price: 50, quantity: 3 } // paracetamol
]

describe('calcSubtotal', () => {
  it('sums price × quantity', () => {
    expect(calcSubtotal(items)).toBe(650)
  })

  it('is 0 for an empty cart', () => {
    expect(calcSubtotal([])).toBe(0)
  })

  it('ignores non-numeric values', () => {
    expect(calcSubtotal([{ price: 'abc', quantity: 2 }, { price: 10, quantity: 1 }])).toBe(10)
  })
})

describe('calcDiscount', () => {
  it('applies a flat discount', () => {
    expect(calcDiscount(650, 'flat', 100)).toBe(100)
  })

  it('caps a flat discount at the subtotal', () => {
    expect(calcDiscount(650, 'flat', 1000)).toBe(650)
  })

  it('applies and rounds a percentage discount', () => {
    expect(calcDiscount(650, 'percentage', 10)).toBe(65)
    expect(calcDiscount(655, 'percentage', 10)).toBe(66) // 65.5 → 66
  })

  it('caps a percentage discount at 100%', () => {
    expect(calcDiscount(650, 'percentage', 150)).toBe(650)
  })

  it('treats empty, zero and negative values as no discount', () => {
    expect(calcDiscount(650, 'flat', '')).toBe(0)
    expect(calcDiscount(650, 'flat', 0)).toBe(0)
    expect(calcDiscount(650, 'percentage', -5)).toBe(0)
  })

  it('is 0 when the cart is empty', () => {
    expect(calcDiscount(0, 'flat', 100)).toBe(0)
  })
})

describe('calcTax', () => {
  it('is 0 when disabled', () => {
    expect(calcTax(1000, false, 17)).toBe(0)
  })

  it('applies and rounds the rate', () => {
    expect(calcTax(1000, true, 17)).toBe(170)
    expect(calcTax(585, true, 17)).toBe(99) // 99.45 → 99
  })

  it('accepts the rate as a string (number input while typing)', () => {
    expect(calcTax(1000, true, '5')).toBe(50)
  })
})

describe('calcTotals', () => {
  it('applies tax after the discount', () => {
    const t = calcTotals({ items, discountType: 'percentage', discountValue: 10, enableTax: true, taxRate: 10 })
    expect(t).toEqual({ subtotal: 650, discount: 65, tax: 59, total: 644 }) // tax on 585 = 58.5 → 59
  })

  it('never goes negative with a full flat discount and tax', () => {
    const t = calcTotals({ items, discountType: 'flat', discountValue: 99999, enableTax: true, taxRate: 10 })
    expect(t).toEqual({ subtotal: 650, discount: 650, tax: 0, total: 0 })
  })

  it('has sensible defaults', () => {
    expect(calcTotals()).toEqual({ subtotal: 0, discount: 0, tax: 0, total: 0 })
  })
})

describe('countUnits', () => {
  it('sums quantities', () => {
    expect(countUnits(items)).toBe(4)
  })
})
