/** Minimal in-memory Web Storage, so storage-backed code runs under Node. */
class MemoryStorage {
  constructor() {
    this.map = new Map()
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null
  }
  setItem(key, value) {
    this.map.set(key, String(value))
  }
  removeItem(key) {
    this.map.delete(key)
  }
  clear() {
    this.map.clear()
  }
}

export function installMemoryStorage() {
  const localStorage = new MemoryStorage()
  const sessionStorage = new MemoryStorage()
  globalThis.window = { localStorage, sessionStorage }
  return { localStorage, sessionStorage }
}
