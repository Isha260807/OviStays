import api from '@/services/api/axios.js'
import { useAuthStore } from '@/core/auth/auth.store.js'
import { useWishlist } from '@/core/wishlist/wishlist.store.js'
import { useUnread } from '@/core/notifications/unread.store.js'

// Logs the guest out here at once, then tells the server so this device's session ends there too.
export async function logoutUser() {
  const { role, refreshToken, clearAuth } = useAuthStore.getState()
  clearAuth()
  useWishlist.getState().clear()
  useUnread.getState().clear()
  if (role === 'user' && refreshToken) {
    await api.post('/user/auth/logout', { refreshToken }).catch(() => {})
  }
}
