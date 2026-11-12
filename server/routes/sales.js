import { Router } from 'express'
import { HttpError, publicUser } from '../auth.js'
import { calcTotals } from '../../src/utils/billing.js'
import { stockStatus, isTracked, applyStockChange } from '../../src/utils/inventory.js'
import { PAYMENT_METHODS } from '../../src/data/defaultCatalog.js'
import { receiptDate, receiptTime } from '../store/clock.js'

const parseDate = (value, label) => {
  if (value === undefined || value === '') return null
  const t = Date.parse(value)
  if (Number.isNaN(t)) throw new HttpError(400, `Invalid ${label} date.`)
  return new Date(t)
}

/**
 * Turns the cart sent by the browser into sale lines using the SERVER's
 * catalog (names and prices can't be changed by the browser).
 */
function buildLines(rawItems, catalog) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new HttpError(400, 'The cart is empty.')
  const lines = new Map()
  for (const raw of rawItems) {
    const type = raw?.type
    const quantity = Number(raw?.quantity)
    if (!['service', 'medicine'].includes(type)) throw new HttpError(400, 'Unknown item in cart.')
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 10000) throw new HttpError(400, 'Invalid quantity.')
    const list = type === 'service' ? catalog.services : catalog.medicines
    const item = list.find(i => i.id === raw.id)
    if (!item) throw new HttpError(409, 'An item in the cart no longer exists. Please remove it and try again.')
    const key = `${type}:${item.id}`
    if (lines.has(key)) lines.get(key).quantity += quantity
    else lines.set(key, { id: item.id, name: item.name, price: item.price, quantity, type })
  }
  return [...lines.values()]
}

function checkStock(lines, catalog, now) {
  for (const line of lines) {
    if (line.type !== 'medicine') continue
    const m = catalog.medicines.find(i => i.id === line.id)
    if (stockStatus(m, now).expired) throw new HttpError(409, `${m.name} is expired and can't be sold.`)
    if (isTracked(m) && line.quantity > m.stock) {
      throw new HttpError(409, m.stock <= 0 ? `${m.name} is out of stock.` : `Only ${m.stock} ${m.name} in stock.`)
    }
  }
}

/** /api/sales */
export default function salesRoutes({ store, auth }) {
  const r = Router()
  r.use(auth.requireAuth)

  // ?from=ISO&to=ISO (either optional)
  r.get('/', async (req, res) => {
    const from = parseDate(req.query.from, 'from')
    const to = parseDate(req.query.to, 'to')
    res.json(await store.salesInRange(from, to))
  })

  r.post('/', async (req, res) => {
    const body = req.body || {}
    const sale = await store.mutate(async () => {
      const now = new Date()
      const catalog = await store.getCatalog()
      const items = buildLines(body.items, catalog)
      checkStock(items, catalog, now)

      const discountType = body.discountType === 'percentage' ? 'percentage' : 'flat'
      const enableTax = !!body.enableTax
      const totals = calcTotals({ items, discountType, discountValue: body.discountValue, enableTax, taxRate: body.taxRate })
      const payment = PAYMENT_METHODS.find(m => m.id === body.paymentMethod) || PAYMENT_METHODS[0]

      const record = {
        receiptNumber: await store.nextReceiptNumber(now),
        createdAt: now.toISOString(),
        date: receiptDate(now, store.timeZone),
        time: receiptTime(now, store.timeZone),
        cashier: publicUser(req.user),
        patientName: String(body.patientName || '').trim().slice(0, 100),
        patientPhone: String(body.patientPhone || '').trim().slice(0, 30),
        items,
        subtotal: totals.subtotal,
        discount: totals.discount,
        discountType,
        discountValue: Number(body.discountValue) || 0,
        tax: totals.tax,
        taxRate: enableTax ? Number(body.taxRate) || 0 : 0,
        grandTotal: totals.total,
        paymentMethod: payment.name
      }

      await store.appendSale(record)
      catalog.medicines = applyStockChange(catalog.medicines, items, -1)
      await store.saveCatalog(catalog)
      return record
    })
    res.status(201).json(sale)
  })

  // { reason, approverId?, approverPin? } — cashiers need an admin's PIN
  r.post('/:receiptNumber/void', async (req, res) => {
    const reason = String(req.body?.reason || '').trim().slice(0, 200)
    if (!reason) throw new HttpError(400, 'A reason is required.')

    let approver = req.user
    if (req.user.role !== 'admin') {
      approver = await auth.verify(String(req.body?.approverId || ''), req.body?.approverPin, { adminOnly: true })
    }

    const sale = await store.mutate(async () => {
      const target = await store.findSale(req.params.receiptNumber)
      if (!target) throw new HttpError(404, 'Sale not found.')
      if (target.voided) throw new HttpError(409, 'This sale is already voided.')

      target.voided = {
        at: new Date().toISOString(),
        reason,
        by: publicUser(approver),
        ...(approver.id !== req.user.id ? { requestedBy: publicUser(req.user) } : {})
      }
      await store.updateSale(target)

      const catalog = await store.getCatalog()
      catalog.medicines = applyStockChange(catalog.medicines, target.items, +1)
      await store.saveCatalog(catalog)
      return target
    })
    res.json(sale)
  })

  return r
}
