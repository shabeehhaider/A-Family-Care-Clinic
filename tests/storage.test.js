import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installMemoryStorage } from './helpers/memoryStorage'
import { nextReceiptNumber, localDateKey, loadSales, saveSales } from '../src/utils/storage'

describe('storage', () => {
  let storage

  beforeEach(() => {
    storage = installMemoryStorage()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('localDateKey uses local date parts', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('20260105')
  })

  it('numbers receipts sequentially within a day', () => {
    vi.setSystemTime(new Date(2026, 10, 8, 9, 0))
    expect(nextReceiptNumber()).toBe('RC-20261108-001')
    expect(nextReceiptNumber()).toBe('RC-20261108-002')
    expect(nextReceiptNumber()).toBe('RC-20261108-003')
  })

  it('restarts numbering on a new day', () => {
    vi.setSystemTime(new Date(2026, 10, 8, 23, 59))
    expect(nextReceiptNumber()).toBe('RC-20261108-001')
    vi.setSystemTime(new Date(2026, 10, 9, 0, 1))
    expect(nextReceiptNumber()).toBe('RC-20261109-001')
  })

  it('round-trips sales and tolerates bad data', () => {
    expect(loadSales()).toEqual([])
    saveSales([{ receiptNumber: 'A' }])
    expect(loadSales()).toEqual([{ receiptNumber: 'A' }])

    storage.localStorage.setItem('afcc.sales', '{not json')
    expect(loadSales()).toEqual([])

    storage.localStorage.setItem('afcc.sales', '{"a":1}')
    expect(loadSales()).toEqual([])
  })
})
