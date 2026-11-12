import { Router } from 'express'
import { HttpError } from '../auth.js'
import { normaliseItem, validateItem, isCatalogType } from '../../src/utils/catalog.js'
import { isTracked } from '../../src/utils/inventory.js'

const listKey = (type) => (type === 'service' ? 'services' : 'medicines')

function checkType(type) {
  if (!isCatalogType(type)) throw new HttpError(404, 'Unknown item type.')
}

function checkName(list, name, exceptId = null) {
  const n = name.toLowerCase()
  if (list.some(i => i.id !== exceptId && i.name.trim().toLowerCase() === n)) {
    throw new HttpError(409, 'An item with this name already exists.')
  }
}

/** /api/catalog — everyone reads; admins change */
export default function catalogRoutes({ store, auth }) {
  const r = Router()
  r.use(auth.requireAuth)

  r.get('/', async (_req, res) => {
    res.json(await store.getCatalog())
  })

  r.post('/:type', auth.requireAdmin, async (req, res) => {
    const { type } = req.params
    checkType(type)
    const item = normaliseItem(type, req.body)
    const problem = validateItem(item)
    if (problem) throw new HttpError(400, problem)

    const created = await store.mutate(async () => {
      const catalog = await store.getCatalog()
      const list = catalog[listKey(type)]
      checkName(list, item.name)
      const newItem = { id: `${type === 'service' ? 's' : 'm'}${Date.now()}`, ...item }
      list.push(newItem)
      await store.saveCatalog(catalog)
      return newItem
    })
    res.status(201).json(created)
  })

  r.put('/:type/:id', auth.requireAdmin, async (req, res) => {
    const { type, id } = req.params
    checkType(type)
    const updated = await store.mutate(async () => {
      const catalog = await store.getCatalog()
      const list = catalog[listKey(type)]
      const existing = list.find(i => i.id === id)
      if (!existing) throw new HttpError(404, 'Item not found.')
      const item = normaliseItem(type, { ...existing, ...req.body })
      const problem = validateItem(item)
      if (problem) throw new HttpError(400, problem)
      checkName(list, item.name, id)
      Object.assign(existing, item) // keeps id and icon
      await store.saveCatalog(catalog)
      return existing
    })
    res.json(updated)
  })

  r.delete('/:type/:id', auth.requireAdmin, async (req, res) => {
    const { type, id } = req.params
    checkType(type)
    await store.mutate(async () => {
      const catalog = await store.getCatalog()
      const key = listKey(type)
      if (!catalog[key].some(i => i.id === id)) throw new HttpError(404, 'Item not found.')
      catalog[key] = catalog[key].filter(i => i.id !== id)
      await store.saveCatalog(catalog)
    })
    res.json({ ok: true })
  })

  // Stock: { mode: 'add' | 'set', quantity }
  r.post('/medicine/:id/stock', auth.requireAdmin, async (req, res) => {
    const mode = req.body?.mode === 'set' ? 'set' : 'add'
    const quantity = Number(req.body?.quantity)
    if (!Number.isInteger(quantity) || quantity < 0) throw new HttpError(400, 'Quantity must be a whole number, 0 or more.')

    const medicine = await store.mutate(async () => {
      const catalog = await store.getCatalog()
      const m = catalog.medicines.find(i => i.id === req.params.id)
      if (!m) throw new HttpError(404, 'Medicine not found.')
      m.stock = mode === 'set' ? quantity : (isTracked(m) ? m.stock : 0) + quantity
      await store.saveCatalog(catalog)
      return m
    })
    res.json(medicine)
  })

  return r
}
