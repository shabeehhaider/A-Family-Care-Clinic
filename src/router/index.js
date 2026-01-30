import { createRouter, createWebHistory } from 'vue-router'

import Pos from '@/views/Pos.vue'

const routes = [
  {
    path: '/',
    name: 'Pos',
    component: Pos,
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router

