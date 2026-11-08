/**
 * Smoke test: server-renders every page with seeded data to catch template /
 * runtime errors (undefined references, bad props) without a browser.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { installMemoryStorage } from './helpers/memoryStorage'

const admin = { id: 'u1', name: 'Dr. Ayesha', role: 'admin', salt: 'aa', pinHash: 'x' }
const cashier = { id: 'u2', name: 'Sara', role: 'cashier', salt: 'bb', pinHash: 'y' }

let views

async function render(component, path = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Pos', component: views.Pos },
      { path: '/sales', name: 'SalesHistory', component: views.SalesHistory },
      { path: '/settings', name: 'Settings', component: views.Settings },
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
  const { localStorage, sessionStorage } = installMemoryStorage()
  const now = new Date()
  localStorage.setItem('afcc.users', JSON.stringify([admin, cashier]))
  localStorage.setItem('afcc.medicines', JSON.stringify([
    { id: 'm1', name: 'Paracetamol 500mg', price: 50, stock: 3, lowStockAt: 10, expiry: '' },
    { id: 'm2', name: 'Old Syrup', price: 90, stock: 0, lowStockAt: 5, expiry: '2020-01-01' },
    { id: 'm3', name: 'Untracked', price: 10 }
  ]))
  localStorage.setItem('afcc.sales', JSON.stringify([
    {
      receiptNumber: 'RC-TEST-001',
      createdAt: now.toISOString(),
      cashier: { id: 'u2', name: 'Sara' },
      patientName: 'Ali',
      items: [{ id: 'm1', name: 'Paracetamol 500mg', price: 50, quantity: 2, type: 'medicine' }],
      subtotal: 100, discount: 0, tax: 0, grandTotal: 100, paymentMethod: 'Cash'
    },
    {
      receiptNumber: 'RC-TEST-002',
      createdAt: now.toISOString(),
      items: [], subtotal: 0, discount: 0, tax: 0, grandTotal: 500, paymentMethod: 'Card',
      voided: { at: now.toISOString(), reason: 'Wrong item', by: { name: 'Dr. Ayesha' } }
    }
  ]))
  sessionStorage.setItem('afcc.session', 'u1')

  // Import after storage is seeded (composables read it at module load)
  vi.resetModules()
  views = {
    Pos: (await import('../src/views/Pos.vue')).default,
    SalesHistory: (await import('../src/views/SalesHistory.vue')).default,
    Settings: (await import('../src/views/Settings.vue')).default,
    Login: (await import('../src/views/Login.vue')).default
  }
})

describe('pages render', () => {
  it('POS shows catalog, stock badges and admin controls', async () => {
    const html = await render(views.Pos)
    expect(html).toContain('Patient Information')
    expect(html).toContain('Consultation')
    expect(html).toContain('Add New Service')
    expect(html).toContain('Confirm Sale')
    expect(html).toContain('Dr. Ayesha')
  })

  it('Sales History lists sales, voids and totals', async () => {
    const html = await render(views.SalesHistory, '/sales')
    expect(html).toContain('RC-TEST-001')
    expect(html).toContain('RC-TEST-002')
    expect(html).toContain('VOID')
    expect(html).toContain('by Sara')
    expect(html).toContain('Print Report')
    expect(html).toContain('1 voided')
  })

  it('Settings lists users and backup', async () => {
    const html = await render(views.Settings, '/settings')
    expect(html).toContain('Sara')
    expect(html).toContain('Download Backup')
    expect(html).toContain('No backup has been made yet')
  })

  it('Login lists users', async () => {
    const html = await render(views.Login, '/login')
    expect(html).toContain("Who&#39;s working?")
    expect(html).toContain('Dr. Ayesha')
  })
})
