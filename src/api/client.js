/**
 * HTTP client for the POS server (axios).
 *
 * - Base URL: VITE_API_URL, or "/api" (same server in production; proxied by
 *   Vite to http://localhost:3001 in development).
 * - Sends the login token on every request.
 * - When the server says the login is no longer valid (401), calls the
 *   handler registered with onUnauthorized() (the app logs out).
 */
import axios from 'axios'

const TOKEN_KEY = 'afcc.token'

export const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || '/api',
  timeout: 20000
})

// Token lives in sessionStorage: closing the browser logs out
export function getToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token)
    else window.sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

let unauthorizedHandler = null
export const onUnauthorized = (fn) => {
  unauthorizedHandler = fn
}

api.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && getToken()) {
      setToken(null)
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  }
)

/** Plain-language message for any request error. */
export function apiError(error) {
  if (error?.response?.data?.error) return error.response.data.error
  if (error?.code === 'ECONNABORTED') return 'The server took too long to answer. Please try again.'
  if (error?.request && !error.response) {
    return "Can't reach the POS server. Check that it is running, then try again."
  }
  return error?.message || 'Something went wrong.'
}
