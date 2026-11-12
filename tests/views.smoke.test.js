/**
 * Smoke test: server-renders every page to catch template / runtime errors
 * (undefined references, bad props) without a browser. The POS server is
 * replaced by a stand-in API client returning sample data.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { installMemoryStorage } from './helpers/memoryStorage'

const admin = { id: 'u1', name: 'Dr. Ayesha', role: 'admin' }
const cashier = { id: 'u2', name: 'Sara', role: 'cashier' }

const catalog = {
  services: [{ id: 's1', name: 'Consultation', price: 500 }],
  medicines: [
    { id: 'm1', name: 'Paracetamol 500mg', price: 50, stock: 3, lowStockAt: 10, expiry: '' },
    { id: 'm2', name: 'Old Syrup', price: 90, stock: 0, lowStockAt: 5, expiry: '2020-01-01' },
    { id: 'm3', name: 'Untracked', price: 10, stock: null }
  ]
}

const RESPONSES = {
  '/auth/status': { hasUsers: true, users: [admin, cashier] },
  '/auth/me': { user: admin },
  '/catalog': catalog,
  '/sales': [],
  '/data/info': { storage: 'database', location: 'Postgres database (test)', lastAutoBackup: '2026-11-09', backupKeepDays: 30 },
  '/data/months': []
}

const fakeApi = {
  get: vi.fn(async (url) => {
    if (!(url in RESPONSES)) throw new Error(`unexpected GET ${url}`)
    return { data: structuredClone(RESPONSES[url]) }
  }),
  post: vi.fn(async () => ({ data: {} })),
  put: vi.fn(async () => ({ data: {} })),
  delete: vi.fn(async () => ({ data: {} }))
}

let views

async function render(component, path = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Pos', component: views.Pos },
      { path: '/sales', name: 'SalesHistory', component: views.SalesHistory },
      { path: '/settings', name: 'Settings', component: views.Settings },
      { path: '/inventory', name: 'Inventory', component: views.Inventory },
      { path: '/login', name: 'Login', component: views.Login }
    ]
  })
  const app = createSSRApp(component)
  app.use(router)
  app.config.warnHandler = (msg) => {
    throw new Error(`Vue warning: ${msg}`)
  }
  router.push(path)
  await router.isReady()
  return renderToString(app, {})
}

beforeAll(async () => {
  installMemoryStorage()
  vi.resetModules()
  vi.doMock('@/api/client', () => ({
    api: fakeApi,
    apiError: (e) => e?.message || 'error',
    getToken: () => 'test-token',
    setToken: () => {},
    onUnauthorized: () => {}
  }))

  // Load login + catalog the way the router / pages do
  const { useAuth } = await import('../src/composables/useAuth.js')
  const { useCatalog } = await import('../src/composables/useCatalog.js')
  await useAuth().init()
  await useCatalog().load()

  views = {
    Pos: (await import('../src/views/Pos.vue')).default,
    SalesHistory: (await import('../src/views/SalesHistory.vue')).default,
    Settings: (await import('../src/views/Settings.vue')).default,
    Login: (await import('../src/views/Login.vue')).default,
    Inventory: (await import('../src/views/Inventory.vue')).default
  }
})

describe('pages render', () => {
  it('POS shows catalog and admin controls', async () => {
    const html = await render(views.Pos)
    expect(html).toContain('Patient Information')
    expect(html).toContain('Consultation')
    expect(html).toContain('Add New Service')
    expect(html).toContain('Confirm Sale')
    expect(html).toContain('Dr. Ayesha')
  })

  it('Sales History renders and starts loading from the server', async () => {
    const html = await render(views.SalesHistory, '/sales')
    expect(html).toContain('Sales History')
    expect(html).toContain('Print Report')
    expect(fakeApi.get).toHaveBeenCalledWith('/sales', expect.objectContaining({ params: expect.any(Object) }))
  })

  it('Settings lists users and the data section', async () => {
    const html = await render(views.Settings, '/settings')
    expect(html).toContain('Sara')
    expect(html).toContain('Data &amp; Backups')
    expect(html).toContain('Monthly sales files')
    expect(html).toContain('Download Backup')
  })

  it('Inventory lists medicines with status and admin actions', async () => {
    const html = await render(views.Inventory, '/inventory')
    expect(html).toContain('Paracetamol 500mg')
    expect(html).toContain('Low stock')
    expect(html).toContain('Expired')
    expect(html).toContain('Stock not set')
    expect(html).toContain('Update Stock')
  })

  it('Login lists users', async () => {
    const html = await render(views.Login, '/login')
    expect(html).toContain("Who&#39;s working?")
    expect(html).toContain('Dr. Ayesha')
  })
})
