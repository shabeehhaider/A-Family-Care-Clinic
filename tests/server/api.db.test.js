/**
 * API suite on the DATABASE store (Postgres via PGlite, in memory), plus
 * database-specific checks: transactions roll back, changes are serialised.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { runApiSuite } from './apiSuite.js'
import { PgStore } from '../../server/store/pgStore.js'
import { pgliteAdapter } from '../../server/store/pgAdapter.js'

const tempStore = async () => {
  const db = pgliteAdapter(new PGlite())
  return { store: new PgStore(db, { location: 'test database' }), cleanup: () => db.close() }
}

runApiSuite('database', tempStore)

describe('database store', () => {
  let ctx
  let store

  beforeAll(async () => {
    ctx = await tempStore()
    store = ctx.store
    await store.init()
  })

  afterAll(() => ctx.cleanup())

  it('creates its tables and the default catalog once', async () => {
    await store.init() // second run is harmless
    const catalog = await store.getCatalog()
    expect(catalog.medicines.find(m => m.id === 'm1')).toMatchObject({ stock: null })
    expect(await store.getUsers()).toEqual([])
  })

  it('rolls back everything if a change fails part-way', async () => {
    const day = new Date(2026, 10, 8, 12)
    await expect(store.mutate(async () => {
      await store.nextReceiptNumber(day) // would use receipt -001
      await store.appendSale({ receiptNumber: 'RC-20261108-001', createdAt: day.toISOString() })
      throw new Error('stock check failed')
    })).rejects.toThrow('stock check failed')

    expect(await store.findSale('RC-20261108-001')).toBe(null)
    // the receipt number was not used up
    expect(await store.mutate(() => store.nextReceiptNumber(day))).toBe('RC-20261108-001')
  })

  it('runs concurrent changes one at a time (unique receipt numbers)', async () => {
    const day = new Date(2026, 10, 9, 12)
    const numbers = await Promise.all(
      Array.from({ length: 8 }, () => store.mutate(() => store.nextReceiptNumber(day)))
    )
    expect(new Set(numbers).size).toBe(8)
  })

  it('keeps the login key across restarts', async () => {
    const a = await store.secret()
    const b = await store.secret()
    expect(a).toMatch(/^[0-9a-f]{96}$/)
    expect(b).toBe(a)
  })

  it('summarises months in SQL and prunes only old daily backups', async () => {
    await store.mutate(async () => {
      await store.appendSale({ receiptNumber: 'RC-A', createdAt: new Date(2026, 9, 5).toISOString(), grandTotal: 100 })
      await store.appendSale({ receiptNumber: 'RC-B', createdAt: new Date(2026, 9, 6).toISOString(), grandTotal: 50, voided: { reason: 'x' } })
    })
    const oct = (await store.monthSummaries()).find(m => m.month === '2026-10')
    expect(oct).toEqual({ month: '2026-10', sales: 1, voided: 1, revenue: 100 })

    await store.mutate(async () => {
      await store.snapshot('2026-01-01')
      await store.snapshot('2026-11-08')
      await store.snapshot('pre-restore-1')
      await store.pruneDailyBackups('2026-06-01')
    })
    const { rows } = await store.db.query('SELECT label FROM backups ORDER BY label')
    expect(rows.map(r => r.label)).toEqual(['2026-11-08', 'pre-restore-1'])
  })
})
