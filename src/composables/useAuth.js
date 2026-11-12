import { ref, computed } from 'vue'
import { api, apiError, getToken, setToken, onUnauthorized } from '@/api/client'

/**
 * Login state (module-level singleton), backed by the POS server.
 *
 * Roles (enforced by the server):
 *  - admin:   everything, incl. catalog/stock, voids, users, data & backups
 *  - cashier: sell, view sales history, reprint
 */

const users = ref([]) // public list { id, name, role } for the login screen / approvals
const hasUsers = ref(false)
const currentUser = ref(null)
const ready = ref(false)

const isAdmin = computed(() => currentUser.value?.role === 'admin')
const adminCount = computed(() => users.value.filter(u => u.role === 'admin').length)

/** Public, safe-to-store reference to a user. */
export const userRef = (user) => (user ? { id: user.id, name: user.name, role: user.role } : null)

let initPromise = null

async function refreshStatus() {
  const { data } = await api.get('/auth/status')
  hasUsers.value = data.hasUsers
  users.value = data.users
}

/** Loads status and restores the session. Safe to call many times. */
function init() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await refreshStatus()
        if (getToken()) {
          try {
            currentUser.value = (await api.get('/auth/me')).data.user
          } catch {
            setToken(null)
            currentUser.value = null
          }
        }
      } finally {
        ready.value = true
      }
    })()
    // let a failed start (server down) be retried
    initPromise.catch(() => { initPromise = null })
  }
  return initPromise
}

function logout() {
  setToken(null)
  currentUser.value = null
}

// Server says the token is no longer valid → log out
onUnauthorized(() => {
  currentUser.value = null
})

const ok = (extra = {}) => ({ ok: true, ...extra })
const fail = (err) => ({ ok: false, error: apiError(err) })

export function useAuth() {
  const setup = async (name, pin) => {
    try {
      const { data } = await api.post('/auth/setup', { name, pin })
      setToken(data.token)
      currentUser.value = data.user
      await refreshStatus()
      return ok()
    } catch (err) {
      return fail(err)
    }
  }

  const login = async (userId, pin) => {
    try {
      const { data } = await api.post('/auth/login', { userId, pin })
      setToken(data.token)
      currentUser.value = data.user
      return ok()
    } catch (err) {
      return fail(err)
    }
  }

  // ---------- user management (admin) ----------
  const createUser = async ({ name, role, pin }) => {
    try {
      const { data } = await api.post('/users', { name, role, pin })
      await refreshStatus()
      return ok({ user: data })
    } catch (err) {
      return fail(err)
    }
  }

  const resetPin = async (userId, pin) => {
    try {
      await api.post(`/users/${encodeURIComponent(userId)}/pin`, { pin })
      return ok()
    } catch (err) {
      return fail(err)
    }
  }

  const deleteUser = async (userId) => {
    try {
      await api.delete(`/users/${encodeURIComponent(userId)}`)
      await refreshStatus()
      return ok()
    } catch (err) {
      return fail(err)
    }
  }

  /** After a restore: users may have changed, so log out and reload. */
  const reload = async () => {
    logout()
    await refreshStatus()
  }

  return {
    users,
    hasUsers,
    currentUser,
    isAdmin,
    adminCount,
    ready,
    init,
    refreshStatus,
    setup,
    login,
    logout,
    createUser,
    resetPin,
    deleteUser,
    reload
  }
}
