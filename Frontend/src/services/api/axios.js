import axios from 'axios'
import { useAuthStore } from '@/core/auth/auth.store.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Identical GET requests made at the same moment (two components asking for the same data, or React
// StrictMode running an effect twice in development) share one network call.
const defaultAdapter = axios.getAdapter(api.defaults.adapter)
const pendingGets = new Map()
api.defaults.adapter = (config) => {
  if (String(config.method || 'get').toLowerCase() !== 'get') return defaultAdapter(config)
  const key = [config.baseURL, config.url, JSON.stringify(config.params || {}), config.headers?.Authorization || ''].join('|')
  if (!pendingGets.has(key)) {
    pendingGets.set(key, defaultAdapter(config).finally(() => pendingGets.delete(key)))
  }
  return pendingGets.get(key)
}

// Calls that must never trigger a token refresh (their 401 means "wrong login", not "expired")
const AUTH_CALL = /\/auth\/(login|send-otp|verify-otp|register|refresh|logout)/

// One refresh at a time: requests that fail together wait for the same new token
let refreshing = null
function refreshAccessToken() {
  refreshing ||= (async () => {
    const { refreshToken, role } = useAuthStore.getState()
    const res = await axios.post(`${api.defaults.baseURL}/${role === 'hotel' ? 'hotel' : 'user'}/auth/refresh`, { refreshToken })
    const { token, refreshToken: next } = res.data.data
    useAuthStore.setState({ token, refreshToken: next })
    return token
  })().finally(() => { refreshing = null })
  return refreshing
}

// An expired access token is renewed quietly; if that is not possible the user is logged out
// and route guards redirect to login.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error
    if (response?.status !== 401 || AUTH_CALL.test(config?.url || '')) return Promise.reject(error)

    const { role, refreshToken } = useAuthStore.getState()
    if ((role === 'user' || role === 'hotel') && refreshToken && !config._retried) {
      try {
        const token = await refreshAccessToken()
        // A copy, because merged duplicate GETs share this config and each one must get its own retry
        const headers = axios.AxiosHeaders.from(config.headers)
        headers.set('Authorization', `Bearer ${token}`)
        return api({ ...config, headers, _retried: true })
      } catch (refreshError) {
        // A network hiccup is not a reason to log out; only a refusal from the server is
        if (refreshError.response && refreshError.response.status !== 401) return Promise.reject(error)
      }
    }
    useAuthStore.getState().clearAuth()
    return Promise.reject(error)
  }
)

export const errorMessage = (error) =>
  error.response?.data?.message || (error.request ? 'Cannot reach the server' : error.message)

export default api
