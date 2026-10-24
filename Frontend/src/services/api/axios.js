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

// An expired or invalid token logs the user out; route guards then redirect to login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLogin = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLogin) useAuthStore.getState().clearAuth()
    return Promise.reject(error)
  }
)

export const errorMessage = (error) =>
  error.response?.data?.message || (error.request ? 'Cannot reach the server' : error.message)

export default api
