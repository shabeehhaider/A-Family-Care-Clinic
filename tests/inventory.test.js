import { describe, it, expect } from 'vitest'
import {
  isTracked, stockStatus, availableToAdd, applyStockChange, statusKey, summarizeInventory
} from '../src/utils/inventory'

const today = new Date(2026, 10, 8)

describe('isTracked', () => {
  it('is true only for numeric stock', () => {
    expect(isTracked({ stock: 0 })).toBe(true)
    expect(isTracked({ stock: 12 })).toBe(true)
    expect(isTracked({ stock: null })).toBe(false)
    expect(isTracked({})).toBe(false)
  })
})

describe('stockStatus', () => {
  it('flags out of stock and low stock', () => {
    expect(stockStatus({ stock: 0 }, today)).toMatchObject({ tracked: true, out: true, low: false })
    expect(stockStatus({ stock: 5, lowStockAt: 10 }, today)).toMatchObject({ out: false, low: true })
    expect(stockStatus({ stock: 50, lowStockAt: 10 }, today)).toMatchObject({ out: false, low: false })
  })

  it('uses the default threshold (10) when none is set', () => {
    expect(stockStatus({ stock: 10 }, today).low).toBe(true)
    expect(stockStatus({ stock: 11 }, today).low).toBe(false)
  })

  it('never flags untracked medicines', () => {
    expect(stockStatus({ stock: null }, today)).toMatchObject({ tracked: false, out: false, low: false })
  })

  it('detects expired and expiring-soon dates', () => {
    expect(stockStatus({ expiry: '2026-11-07' }, today)).toMatchObject({ expired: true, daysToExpiry: -1 })
    expect(stockStatus({ expiry: '2026-11-08' }, today)).toMatchObject({ expired: false, expiringSoon: true, daysToExpiry: 0 })
    expect(stockStatus({ expiry: '2026-12-08' }, today)).toMatchObject({ expiringSoon: true, daysToExpiry: 30 })
    expect(stockStatus({ expiry: '2026-12-09' }, today)).toMatchObject({ expiringSoon: false })
    expect(stockStatus({ expiry: '' }, today)).toMatchObject({ expired: false, expiringSoon: false, daysToExpiry: null })
  })
})

describe('availableToAdd', () => {
  it('subtracts what is already in the cart', () => {
    expect(availableToAdd({ stock: 5 }, 3)).toBe(2)
    expect(availableToAdd({ stock: 5 }, 7)).toBe(0)
  })

  it('is unlimited when untracked', () => {
    expect(availableToAdd({ stock: null }, 100)).toBe(Infinity)
  })
})

describe('applyStockChange', () => {
  const medicines = [
    { id: 'm1', stock: 10 },
    { id: 'm2', stock: null },
    { id: 'm3', stock: 1 }
  ]
  const items = [
    { id: 'm1', type: 'medicine', quantity: 3 },
    { id: 'm2', type: 'medicine', quantity: 5 },
    { id: 'm3', type: 'medicine', quantity: 4 },
    { id: 'm1', type: 'service', quantity: 9 } // same id, different type: ignored
  ]

  it('deducts for a sale, ignoring untracked items and never going below 0', () => {
    const after = applyStockChange(medicines, items, -1)
    expect(after).toEqual([
      { id: 'm1', stock: 7 },
      { id: 'm2', stock: null },
      { id: 'm3', stock: 0 }
    ])
  })

  it('restores for a void', () => {
    const after = applyStockChange(medicines, items, +1)
    expect(after[0].stock).toBe(13)
    expect(after[2].stock).toBe(5)
  })

  it('does not mutate the input', () => {
    applyStockChange(medicines, items, -1)
    expect(medicines[0].stock).toBe(10)
  })

  it('returns the same array when no medicines are involved', () => {
    expect(applyStockChange(medicines, [{ id: 's1', type: 'service', quantity: 1 }], -1)).toBe(medicines)
  })
})

describe('statusKey', () => {
  it('picks the most urgent state', () => {
    expect(statusKey(stockStatus({ stock: 0, expiry: '2020-01-01' }, today))).toBe('expired')
    expect(statusKey(stockStatus({ stock: 0 }, today))).toBe('out')
    expect(statusKey(stockStatus({ stock: 2 }, today))).toBe('low')
    expect(statusKey(stockStatus({ stock: 50, expiry: '2026-11-20' }, today))).toBe('expiring')
    expect(statusKey(stockStatus({}, today))).toBe('unset')
    expect(statusKey(stockStatus({ stock: 50 }, today))).toBe('ok')
  })
})

describe('summarizeInventory', () => {
  it('counts each state', () => {
    const s = summarizeInventory([
      { stock: 0 },
      { stock: 3 },
      { stock: 50, expiry: '2026-11-01' },
      { stock: 50 },
      {}
    ], today)
    expect(s).toEqual({ total: 5, out: 1, low: 1, expiring: 1, unset: 1, attention: 3 })
  })
})
