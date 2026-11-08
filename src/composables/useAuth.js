import { ref, computed, watch } from 'vue'
import { STORAGE_KEYS, loadFromStorage, saveToStorage, loadSession, saveSession } from '@/utils/storage'
import { hashPin, randomSalt, isValidPin } from '@/utils/crypto'

/**
 * Users, PIN login and roles. Module-level singleton.
 *
 * Roles:
 *  - admin:   everything, incl. catalog editing, voids, users, backup/restore
 *  - cashier: sell and view sales history (reprint)
 *
 * Users live in localStorage (PINs salted + hashed); the logged-in user id is
 * in sessionStorage, so closing the browser logs out.
 */

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30_000

const users = ref(loadUsers())
const currentUserId = ref(loadSession())
const failedAttempts = new Map() // userId -> { count, lockedUntil }

function loadUsers() {
  const list = loadFromStorage(STORAGE_KEYS.users, [])
  return Array.isArray(list) ? list : []
}

watch(users, value => saveToStorage(STORAGE_KEYS.users, value), { deep: true })

const currentUser = computed(() => users.value.find(u => u.id === currentUserId.value) || null)
const isAdmin = computed(() => currentUser.value?.role === 'admin')
const hasUsers = computed(() => users.value.length > 0)
const adminCount = computed(() => users.value.filter(u => u.role === 'admin').length)

/** Public, safe-to-store reference to a user (no PIN data). */
export const userRef = (user) => (user ? { id: user.id, name: user.name, role: user.role } : null)

function checkPin(user, pin) {
  return !!user && hashPin(String(pin), user.salt) === user.pinHash
}

/** Seconds remaining in a lockout, or 0. */
function lockoutRemaining(userId) {
  const entry = failedAttempts.get(userId)
  if (!entry?.lockedUntil) return 0
  const ms = entry.lockedUntil - Date.now()
  if (ms <= 0) {
    failedAttempts.delete(userId)
    return 0
  }
  return Math.ceil(ms / 1000)
}

function recordFailure(userId) {
  const entry = failedAttempts.get(userId) || { count: 0, lockedUntil: 0 }
  entry.count++
  if (entry.count >= MAX_ATTEMPTS) {
    entry.count = 0
    entry.lockedUntil = Date.now() + LOCKOUT_MS
  }
  failedAttempts.set(userId, entry)
}

export function useAuth() {
  /**
   * @returns {{ ok: true } | { ok: false, error: string }}
   */
  const createUser = ({ name, role, pin }) => {
    const cleanName = String(name || '').trim()
    if (!cleanName) return { ok: false, error: 'Name is required.' }
    if (!isValidPin(pin)) return { ok: false, error: 'PIN must be 4–6 digits.' }
    if (users.value.some(u => u.name.toLowerCase() === cleanName.toLowerCase())) {
      return { ok: false, error: 'A user with this name already exists.' }
    }
    const salt = randomSalt()
    const user = {
      id: `u${Date.now()}`,
      name: cleanName,
      role: role === 'admin' ? 'admin' : 'cashier',
      salt,
      pinHash: hashPin(pin, salt),
      createdAt: new Date().toISOString()
    }
    users.value.push(user)
    return { ok: true, user }
  }

  const resetPin = (userId, pin) => {
    if (!isValidPin(pin)) return { ok: false, error: 'PIN must be 4–6 digits.' }
    const user = users.value.find(u => u.id === userId)
    if (!user) return { ok: false, error: 'User not found.' }
    user.salt = randomSalt()
    user.pinHash = hashPin(pin, user.salt)
    return { ok: true }
  }

  const deleteUser = (userId) => {
    const user = users.value.find(u => u.id === userId)
    if (!user) return { ok: false, error: 'User not found.' }
    if (user.id === currentUserId.value) return { ok: false, error: "You can't delete yourself." }
    if (user.role === 'admin' && adminCount.value <= 1) {
      return { ok: false, error: "You can't delete the last admin." }
    }
    users.value = users.value.filter(u => u.id !== userId)
    return { ok: true }
  }

  const login = (userId, pin) => {
    const wait = lockoutRemaining(userId)
    if (wait) return { ok: false, error: `Too many wrong PINs. Try again in ${wait}s.` }

    const user = users.value.find(u => u.id === userId)
    if (!checkPin(user, pin)) {
      recordFailure(userId)
      const lock = lockoutRemaining(userId)
      return { ok: false, error: lock ? `Too many wrong PINs. Try again in ${lock}s.` : 'Wrong PIN.' }
    }
    failedAttempts.delete(userId)
    currentUserId.value = user.id
    saveSession(user.id)
    return { ok: true }
  }

  const logout = () => {
    currentUserId.value = null
    saveSession(null)
  }

  /** Admin approval for a cashier's action (e.g. void). Returns the admin or null. */
  const verifyAdmin = (userId, pin) => {
    const wait = lockoutRemaining(userId)
    if (wait) return { ok: false, error: `Too many wrong PINs. Try again in ${wait}s.` }
    const user = users.value.find(u => u.id === userId && u.role === 'admin')
    if (!checkPin(user, pin)) {
      recordFailure(userId)
      return { ok: false, error: 'Wrong admin PIN.' }
    }
    failedAttempts.delete(userId)
    return { ok: true, user }
  }

  /** Re-read from storage (after a backup restore); logs out. */
  const reload = () => {
    users.value = loadUsers()
    logout()
  }

  return {
    users,
    currentUser,
    isAdmin,
    hasUsers,
    adminCount,
    createUser,
    resetPin,
    deleteUser,
    login,
    logout,
    verifyAdmin,
    reload
  }
}
