/**
 * The server API test suite, run against each data store (see
 * api.file.test.js and api.db.test.js). Uses the real Express app in-process.
 *
 * @param label      e.g. "files"
 * @param makeStore  async () => ({ store, cleanup })
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createApp } from '../../server/app.js'
import { monthKey } from '../../server/store/clock.js'
import { dailyBackup } from '../../server/backup.js'

export function runApiSuite(label, makeStore) {
describe(`API (${label})`, () => {
let server
let base
let store
let cleanup
let adminToken
let cashierToken
let adminId
let cashierId
let receipt

async function call(method, url, { token, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

beforeAll(async () => {
  ;({ store, cleanup } = await makeStore())
  const created = await createApp(
    { distDir: null, tokenTtl: '1h', backupKeepDays: 90, cronSecret: 'cron-test' },
    { store }
  )
  await new Promise(resolve => {
    server = created.app.listen(0, '127.0.0.1', resolve)
  })
  base = `http://127.0.0.1:${server.address().port}/api`
})

afterAll(async () => {
  await new Promise(resolve => server.close(resolve))
  await cleanup()
})

describe('setup and login', () => {
  it('reports no users before setup', async () => {
    const { status, body } = await call('GET', '/auth/status')
    expect(status).toBe(200)
    expect(body).toEqual({ hasUsers: false, users: [] })
  })

  it('creates the first admin once', async () => {
    const first = await call('POST', '/auth/setup', { body: { name: 'Dr. Ayesha', pin: '4826' } })
    expect(first.status).toBe(201)
    expect(first.body.user).toMatchObject({ name: 'Dr. Ayesha', role: 'admin' })
    adminToken = first.body.token
    adminId = first.body.user.id

    const again = await call('POST', '/auth/setup', { body: { name: 'Someone', pin: '1111' } })
    expect(again.status).toBe(409)
  })

  it('never stores the PIN itself', async () => {
    const users = await store.getUsers()
    expect(JSON.stringify(users)).not.toContain('4826')
    expect(users[0]).toHaveProperty('pinHash')
  })

  it('logs in with the right PIN only', async () => {
    expect((await call('POST', '/auth/login', { body: { userId: adminId, pin: '0000' } })).status).toBe(400)
    const ok = await call('POST', '/auth/login', { body: { userId: adminId, pin: '4826' } })
    expect(ok.status).toBe(200)
    expect(ok.body.token).toBeTruthy()
  })

  it('requires a valid token', async () => {
    expect((await call('GET', '/catalog')).status).toBe(401)
    expect((await call('GET', '/catalog', { token: 'nonsense' })).status).toBe(401)
    expect((await call('GET', '/auth/me', { token: adminToken })).body.user.name).toBe('Dr. Ayesha')
  })

  it('admins add cashiers; cashiers cannot use admin endpoints', async () => {
    const created = await call('POST', '/users', { token: adminToken, body: { name: 'Sara', role: 'cashier', pin: '1234' } })
    expect(created.status).toBe(201)
    cashierId = created.body.id
    cashierToken = (await call('POST', '/auth/login', { body: { userId: cashierId, pin: '1234' } })).body.token

    expect((await call('GET', '/users', { token: cashierToken })).status).toBe(403)
    expect((await call('POST', '/catalog/service', { token: cashierToken, body: { name: 'X', price: 1 } })).status).toBe(403)
    expect((await call('GET', '/data/backup', { token: cashierToken })).status).toBe(403)
  })

  it('locks a user out after 5 wrong PINs', async () => {
    const tmp = await call('POST', '/users', { token: adminToken, body: { name: 'Temp', role: 'cashier', pin: '5555' } })
    for (let i = 0; i < 4; i++) {
      expect((await call('POST', '/auth/login', { body: { userId: tmp.body.id, pin: '0000' } })).status).toBe(400)
    }
    expect((await call('POST', '/auth/login', { body: { userId: tmp.body.id, pin: '0000' } })).status).toBe(429)
    // even the right PIN is refused while locked
    expect((await call('POST', '/auth/login', { body: { userId: tmp.body.id, pin: '5555' } })).status).toBe(429)
    await call('DELETE', `/users/${tmp.body.id}`, { token: adminToken })
  })

  it("won't delete yourself or the last admin", async () => {
    expect((await call('DELETE', `/users/${adminId}`, { token: adminToken })).status).toBe(400)
  })
})

describe('catalog and stock', () => {
  it('starts with the default catalog', async () => {
    const { body } = await call('GET', '/catalog', { token: cashierToken })
    expect(body.services.length).toBeGreaterThan(0)
    expect(body.medicines.find(m => m.id === 'm1')).toMatchObject({ name: 'Paracetamol 500mg', stock: null })
  })

  it('sets and adds stock', async () => {
    expect((await call('POST', '/catalog/medicine/m1/stock', { token: adminToken, body: { mode: 'set', quantity: 5 } })).body.stock).toBe(5)
    expect((await call('POST', '/catalog/medicine/m1/stock', { token: adminToken, body: { mode: 'add', quantity: 2 } })).body.stock).toBe(7)
    expect((await call('POST', '/catalog/medicine/m1/stock', { token: adminToken, body: { mode: 'add', quantity: -1 } })).status).toBe(400)
  })

  it('validates and rejects duplicate names', async () => {
    expect((await call('POST', '/catalog/medicine', { token: adminToken, body: { name: '', price: 5 } })).status).toBe(400)
    expect((await call('POST', '/catalog/medicine', { token: adminToken, body: { name: 'paracetamol 500MG', price: 5 } })).status).toBe(409)
    const ok = await call('POST', '/catalog/medicine', { token: adminToken, body: { name: 'Old Syrup', price: 90, stock: 10, expiry: '2020-01-01' } })
    expect(ok.status).toBe(201)
    expect(ok.body).toMatchObject({ name: 'Old Syrup', stock: 10, expiry: '2020-01-01' })
  })
})

describe('sales', () => {
  it('creates a sale using server prices, numbers it and deducts stock', async () => {
    const res = await call('POST', '/sales', {
      token: cashierToken,
      body: {
        items: [
          { id: 's1', type: 'service', quantity: 1, price: 1 }, // price from the browser is ignored
          { id: 'm1', type: 'medicine', quantity: 3 }
        ],
        discountType: 'flat',
        discountValue: 50,
        paymentMethod: 'card',
        patientName: 'Ali'
      }
    })
    expect(res.status).toBe(201)
    receipt = res.body
    expect(receipt.receiptNumber).toMatch(/^RC-\d{8}-001$/)
    expect(receipt).toMatchObject({ subtotal: 650, discount: 50, grandTotal: 600, paymentMethod: 'Card', patientName: 'Ali' })
    expect(receipt.cashier).toMatchObject({ name: 'Sara', role: 'cashier' })

    const catalog = (await call('GET', '/catalog', { token: cashierToken })).body
    expect(catalog.medicines.find(m => m.id === 'm1').stock).toBe(4)

    const second = await call('POST', '/sales', { token: cashierToken, body: { items: [{ id: 's2', type: 'service', quantity: 1 }] } })
    expect(second.body.receiptNumber).toMatch(/-002$/)
  })

  it('files each sale under its month', async () => {
    const key = monthKey(new Date())
    expect((await store.getMonth(key)).map(s => s.receiptNumber)).toContain(receipt.receiptNumber)
    expect((await call('GET', '/data/months', { token: adminToken })).body[0]).toMatchObject({ month: key, sales: 2 })
    const download = await call('GET', `/data/months/${key}`, { token: adminToken })
    expect(download.body.map(s => s.receiptNumber)).toContain(receipt.receiptNumber)
  })

  it('refuses more than the stock, expired items and unknown items', async () => {
    const over = await call('POST', '/sales', { token: cashierToken, body: { items: [{ id: 'm1', type: 'medicine', quantity: 5 }] } })
    expect(over.status).toBe(409)
    expect(over.body.error).toBe('Only 4 Paracetamol 500mg in stock.')

    const catalog = (await call('GET', '/catalog', { token: cashierToken })).body
    const syrup = catalog.medicines.find(m => m.name === 'Old Syrup')
    const expired = await call('POST', '/sales', { token: cashierToken, body: { items: [{ id: syrup.id, type: 'medicine', quantity: 1 }] } })
    expect(expired.status).toBe(409)
    expect(expired.body.error).toMatch(/expired/)

    expect((await call('POST', '/sales', { token: cashierToken, body: { items: [{ id: 'nope', type: 'medicine', quantity: 1 }] } })).status).toBe(409)
    expect((await call('POST', '/sales', { token: cashierToken, body: { items: [] } })).status).toBe(400)
  })

  it('lists sales by date range', async () => {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const today = await call('GET', `/sales?from=${from}`, { token: cashierToken })
    expect(today.body).toHaveLength(2)
    const past = await call('GET', '/sales?to=2000-01-01T00:00:00.000Z', { token: cashierToken })
    expect(past.body).toHaveLength(0)
  })

  it('cashier voids need an admin PIN; voiding restores stock', async () => {
    const url = `/sales/${receipt.receiptNumber}/void`
    expect((await call('POST', url, { token: cashierToken, body: { reason: '' } })).status).toBe(400)
    expect((await call('POST', url, { token: cashierToken, body: { reason: 'Wrong item' } })).status).toBe(400)
    expect((await call('POST', url, { token: cashierToken, body: { reason: 'Wrong item', approverId: adminId, approverPin: '0000' } })).body.error).toBe('Wrong admin PIN.')

    const ok = await call('POST', url, { token: cashierToken, body: { reason: 'Wrong item', approverId: adminId, approverPin: '4826' } })
    expect(ok.status).toBe(200)
    expect(ok.body.voided).toMatchObject({ reason: 'Wrong item', by: { name: 'Dr. Ayesha' }, requestedBy: { name: 'Sara' } })

    const catalog = (await call('GET', '/catalog', { token: cashierToken })).body
    expect(catalog.medicines.find(m => m.id === 'm1').stock).toBe(7)

    expect((await call('POST', url, { token: adminToken, body: { reason: 'again' } })).status).toBe(409)
  })
})

describe('backups', () => {
  it('makes a daily automatic copy', async () => {
    await dailyBackup(store, 90)
    expect(await store.lastAutoBackup()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect((await call('GET', '/data/info', { token: adminToken })).body.lastAutoBackup).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('runs the daily backup from the cron URL only with the secret', async () => {
    expect((await call('GET', '/cron/daily-backup')).status).toBe(401)
    expect((await call('GET', '/cron/daily-backup', { token: 'wrong' })).status).toBe(401)
    const ok = await call('GET', '/cron/daily-backup', { token: 'cron-test' })
    expect(ok.status).toBe(200)
    expect(ok.body.backup).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('exports everything and restores it, keeping a safety copy', async () => {
    const backup = (await call('GET', '/data/backup', { token: adminToken })).body
    expect(backup.app).toBe('afcc-pos-server')

    // change something, then restore
    await call('POST', '/catalog/medicine/m1/stock', { token: adminToken, body: { mode: 'set', quantity: 99 } })
    const restored = await call('POST', '/data/restore', { token: adminToken, body: backup })
    expect(restored.status).toBe(200)
    expect(restored.body.safetyCopy).toMatch(/pre-restore-/)

    const catalog = (await call('GET', '/catalog', { token: adminToken })).body
    expect(catalog.medicines.find(m => m.id === 'm1').stock).toBe(7)
  })

  it('rejects a restore file without an admin', async () => {
    const bad = { app: 'afcc-pos-server', version: 1, data: { users: [], catalog: { services: [], medicines: [] }, sales: {} } }
    expect((await call('POST', '/data/restore', { token: adminToken, body: bad })).status).toBe(400)
  })

  it('imports data from the old browser version without duplicating receipts', async () => {
    const old = {
      app: 'afcc-pos',
      version: 1,
      data: {
        services: [{ id: 's1', name: 'Consultation', price: 700 }],
        medicines: [{ id: 'm1', name: 'Paracetamol 500mg', price: 50, stock: 20 }],
        sales: [
          { receiptNumber: 'RC-20260105-001', createdAt: new Date(2026, 0, 5, 10).toISOString(), items: [], grandTotal: 100 },
          { receiptNumber: receipt.receiptNumber, createdAt: receipt.createdAt, items: [], grandTotal: 1 } // already there
        ],
        receiptCounter: { date: '20260105', seq: 1 }
      }
    }
    const res = await call('POST', '/data/import-browser', { token: adminToken, body: { backup: old } })
    expect(res.body).toEqual({ imported: 1, skipped: 1, catalogReplaced: true })

    const jan = await store.getMonth('2026-01')
    expect(jan[0].receiptNumber).toBe('RC-20260105-001')
    expect((await call('GET', '/catalog', { token: adminToken })).body.services[0].price).toBe(700)
  })
})
})
}
