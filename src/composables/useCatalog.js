import { ref, watch } from 'vue'
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '@/utils/storage'
import { applyStockChange } from '@/utils/inventory'
import {
  DEFAULT_SERVICES,
  DEFAULT_MEDICINES,
  DEFAULT_SERVICE_ICON,
  MEDICINE_ICON
} from '@/data/defaultCatalog'

/**
 * Shared catalog state (services & medicines), persisted to localStorage.
 *
 * Module-level singleton: POS and Sales History see the same data, so e.g.
 * voiding a sale in Sales History restores stock shown in the POS.
 */

const services = ref(loadFromStorage(STORAGE_KEYS.services, DEFAULT_SERVICES))
const medicines = ref(loadFromStorage(STORAGE_KEYS.medicines, DEFAULT_MEDICINES))

watch(services, value => saveToStorage(STORAGE_KEYS.services, value), { deep: true })
watch(medicines, value => saveToStorage(STORAGE_KEYS.medicines, value), { deep: true })

const listFor = (type) => (type === 'service' ? services : medicines)

export const typeLabel = (type) => (type === 'service' ? 'Service' : 'Medicine')

export const iconFor = (item, type) =>
  type === 'service' ? (item.icon || DEFAULT_SERVICE_ICON) : MEDICINE_ICON

/** Keep only known fields with sane types. */
function normalise(type, data) {
  const item = {
    name: String(data.name || '').trim(),
    price: Number(data.price) || 0
  }
  if (type === 'medicine') {
    const stock = data.stock === '' || data.stock === null || data.stock === undefined
      ? null
      : Math.max(0, Math.floor(Number(data.stock)) || 0)
    item.stock = stock
    item.lowStockAt = Number.isFinite(Number(data.lowStockAt)) && data.lowStockAt !== ''
      ? Math.max(0, Math.floor(Number(data.lowStockAt)))
      : 10
    item.expiry = data.expiry || ''
  }
  return item
}

export function useCatalog() {
  const isNameTaken = (type, name, exceptId = null) => {
    const n = String(name || '').trim().toLowerCase()
    return !!n && listFor(type).value.some(i => i.id !== exceptId && i.name.trim().toLowerCase() === n)
  }

  const findItem = (type, id) => listFor(type).value.find(i => i.id === id) || null

  const addItem = (type, data) => {
    const item = { id: `${type === 'service' ? 's' : 'm'}${Date.now()}`, ...normalise(type, data) }
    listFor(type).value.push(item)
    return item
  }

  const updateItem = (type, id, data) => {
    const item = findItem(type, id)
    if (!item) return null
    Object.assign(item, normalise(type, { ...item, ...data }))
    return item
  }

  const deleteItem = (type, id) => {
    const list = listFor(type)
    list.value = list.value.filter(i => i.id !== id)
  }

  /** Deduct stock for a confirmed sale. */
  const deductStock = (items) => {
    medicines.value = applyStockChange(medicines.value, items, -1)
  }

  /** Put stock back when a sale is voided. */
  const restoreStock = (items) => {
    medicines.value = applyStockChange(medicines.value, items, +1)
  }

  /** Re-read from storage (after a backup restore). */
  const reload = () => {
    services.value = loadFromStorage(STORAGE_KEYS.services, DEFAULT_SERVICES)
    medicines.value = loadFromStorage(STORAGE_KEYS.medicines, DEFAULT_MEDICINES)
  }

  return {
    services,
    medicines,
    listFor,
    findItem,
    isNameTaken,
    addItem,
    updateItem,
    deleteItem,
    deductStock,
    restoreStock,
    reload
  }
}
