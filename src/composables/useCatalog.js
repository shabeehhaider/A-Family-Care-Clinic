import { ref } from 'vue'
import { api, apiError } from '@/api/client'
import { DEFAULT_SERVICE_ICON, MEDICINE_ICON } from '@/data/defaultCatalog'

/**
 * Catalog (services & medicines), loaded from and saved to the POS server.
 * Module-level singleton so every page shows the same data.
 *
 * Stock changes from sales and voids happen on the server; call load()
 * afterwards to show the new numbers.
 */

const services = ref([])
const medicines = ref([])
const loading = ref(false)
const loaded = ref(false)
const loadError = ref('')

const listFor = (type) => (type === 'service' ? services : medicines)

export const typeLabel = (type) => (type === 'service' ? 'Service' : 'Medicine')

export const iconFor = (item, type) =>
  type === 'service' ? (item.icon || DEFAULT_SERVICE_ICON) : MEDICINE_ICON

const replaceItem = (type, item) => {
  const list = listFor(type)
  const i = list.value.findIndex(x => x.id === item.id)
  if (i === -1) list.value.push(item)
  else list.value.splice(i, 1, item)
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/catalog')
    services.value = data.services
    medicines.value = data.medicines
    loaded.value = true
    loadError.value = ''
  } catch (err) {
    loadError.value = apiError(err)
  } finally {
    loading.value = false
  }
}

/** Loads once (pages call this on open). */
function ensureLoaded() {
  if (!loaded.value && !loading.value) load()
}

const ok = (extra = {}) => ({ ok: true, ...extra })
const fail = (err) => ({ ok: false, error: apiError(err) })

export function useCatalog() {
  const isNameTaken = (type, name, exceptId = null) => {
    const n = String(name || '').trim().toLowerCase()
    return !!n && listFor(type).value.some(i => i.id !== exceptId && i.name.trim().toLowerCase() === n)
  }

  const findItem = (type, id) => listFor(type).value.find(i => i.id === id) || null

  const addItem = async (type, data) => {
    try {
      const { data: item } = await api.post(`/catalog/${type}`, data)
      replaceItem(type, item)
      return ok({ item })
    } catch (err) {
      return fail(err)
    }
  }

  const updateItem = async (type, id, data) => {
    try {
      const { data: item } = await api.put(`/catalog/${type}/${encodeURIComponent(id)}`, data)
      replaceItem(type, item)
      return ok({ item })
    } catch (err) {
      return fail(err)
    }
  }

  const deleteItem = async (type, id) => {
    try {
      await api.delete(`/catalog/${type}/${encodeURIComponent(id)}`)
      const list = listFor(type)
      list.value = list.value.filter(i => i.id !== id)
      return ok()
    } catch (err) {
      return fail(err)
    }
  }

  /** mode 'add' (received units) or 'set' (exact count) */
  const setStock = async (id, mode, quantity) => {
    try {
      const { data: item } = await api.post(`/catalog/medicine/${encodeURIComponent(id)}/stock`, { mode, quantity })
      replaceItem('medicine', item)
      return ok({ item })
    } catch (err) {
      return fail(err)
    }
  }

  return {
    services,
    medicines,
    loading,
    loaded,
    loadError,
    load,
    ensureLoaded,
    listFor,
    findItem,
    isNameTaken,
    addItem,
    updateItem,
    deleteItem,
    setStock
  }
}
