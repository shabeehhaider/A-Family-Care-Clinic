import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { FileStore } from '../../server/store/fileStore.js'
import { monthKey, dayKey, monthFromReceipt, isMonthKey, previousMonthKey } from '../../server/store/clock.js'

let dir
let store

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'afcc-store-'))
  store = new FileStore(dir)
  await store.init()
})

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('helpers', () => {
  it('uses Pakistan time, whatever the server clock is', () => {
    // 2026-11-30 20:30 UTC is already 1 December 01:30 in Karachi (UTC+5)
    const late = new Date(Date.UTC(2026, 10, 30, 20, 30))
    expect(monthKey(late, 'Asia/Karachi')).toBe('2026-12')
    expect(dayKey(late, 'Asia/Karachi')).toBe('20261201')
    expect(monthKey(late, 'UTC')).toBe('2026-11')
  })

  it('works out months', () => {
    expect(previousMonthKey('2026-01')).toBe('2025-12')
    expect(previousMonthKey('2026-11')).toBe('2026-10')
    expect(monthFromReceipt('RC-20261108-001')).toBe('2026-11')
    expect(monthFromReceipt('nonsense')).toBe(null)
    expect(isMonthKey('2026-12')).toBe(true)
    expect(isMonthKey('2026-13')).toBe(false)
    expect(isMonthKey('../etc')).toBe(false)
  })
})

describe('receipt numbers', () => {
  it('count up within a day and restart the next day', async () => {
    expect(await store.nextReceiptNumber(new Date(2026, 10, 8, 9))).toBe('RC-20261108-001')
    expect(await store.nextReceiptNumber(new Date(2026, 10, 8, 18))).toBe('RC-20261108-002')
    expect(await store.nextReceiptNumber(new Date(2026, 10, 9, 0, 1))).toBe('RC-20261109-001')
  })
})

describe('monthly sales files', () => {
  const sale = (n, date) => ({ receiptNumber: `RC-${n}`, createdAt: date.toISOString() })

  it('puts each sale in its month file and reads ranges across months', async () => {
    await store.appendSale(sale(1, new Date(2026, 9, 31, 20)))
    await store.appendSale(sale(2, new Date(2026, 10, 1, 9)))
    await store.appendSale(sale(3, new Date(2026, 10, 15, 9)))

    expect(await store.listMonths()).toEqual(['2026-10', '2026-11'])
    expect((await store.getMonth('2026-11')).map(s => s.receiptNumber)).toEqual(['RC-2', 'RC-3'])

    const nov = await store.salesInRange(new Date(2026, 10, 1), new Date(2026, 11, 1))
    expect(nov.map(s => s.receiptNumber)).toEqual(['RC-2', 'RC-3'])
    expect((await store.salesInRange(null, null)).length).toBe(3)
  })

  it('writes atomically (no temp files left behind)', async () => {
    await store.appendSale(sale(1, new Date(2026, 10, 8)))
    const files = await fs.readdir(path.join(dir, 'sales'))
    expect(files).toEqual(['2026-11.json'])
  })

  it('runs changes one at a time', async () => {
    const day = new Date(2026, 10, 8, 12)
    const numbers = await Promise.all(
      Array.from({ length: 10 }, () => store.mutate(() => store.nextReceiptNumber(day)))
    )
    expect(new Set(numbers).size).toBe(10)
  })
})
