import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    // devtools overlay only in the dev server, not in tests
    mode !== 'test' && vueDevTools(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    // dev: send /api to the POS server (npm run server)
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
}))
