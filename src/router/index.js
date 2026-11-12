import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

import Pos from '@/views/Pos.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true, title: 'Log in' }
  },
  {
    path: '/',
    name: 'Pos',
    component: Pos,
    meta: { title: 'POS' }
  },
  {
    path: '/sales',
    name: 'SalesHistory',
    component: () => import('@/views/SalesHistory.vue'),
    meta: { title: 'Sales History' }
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('@/views/Inventory.vue'),
    meta: { title: 'Inventory' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { admin: true, title: 'Settings' }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/**
 * - No users yet → /login (first-run admin setup)
 * - Not logged in → /login?redirect=…
 * - Admin-only pages → POS for cashiers
 */
router.beforeEach(async (to) => {
  const { hasUsers, currentUser, isAdmin, init } = useAuth()

  try {
    await init()
  } catch {
    // Server unreachable: the login page shows the problem and a Retry button
    return to.name === 'Login' ? true : { name: 'Login' }
  }

  if (to.meta.public) {
    // Already logged in: skip the login page
    if (to.name === 'Login' && currentUser.value) return { name: 'Pos' }
    return true
  }
  if (!hasUsers.value || !currentUser.value) {
    return { name: 'Login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }
  if (to.meta.admin && !isAdmin.value) return { name: 'Pos' }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} — A Family Care Clinic`
    : 'A Family Care Clinic — POS'
})

export default router
