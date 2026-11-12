import { DEFAULT_SERVICES, DEFAULT_MEDICINES } from '../../src/data/defaultCatalog.js'

/** Starting catalog for a new install (medicine stock not tracked yet). */
export const defaultCatalog = () => ({
  services: structuredClone(DEFAULT_SERVICES),
  medicines: DEFAULT_MEDICINES.map(m => ({ ...m, stock: null, lowStockAt: 10, expiry: '' }))
})
