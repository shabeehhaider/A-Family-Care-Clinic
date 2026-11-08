import { createRouter, createWebHistory } from 'vue-router'

import Pos from '@/views/Pos.vue'

const routes = [
  {
    path: '/',
    name: 'Pos',
    component: Pos,
  },
  {
    path: '/sales',
    name: 'SalesHistory',
    component: () => import('@/views/SalesHistory.vue'),
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router

