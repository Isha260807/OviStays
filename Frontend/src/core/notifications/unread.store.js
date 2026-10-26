import { create } from 'zustand'
import api from '@/services/api/axios.js'
import { useAuthStore } from '@/core/auth/auth.store.js'

const FRESH_MS = 2 * 60 * 1000

let inFlight = null

// Unread notification count shared by every bell on the page. It is fetched once and reused,
// so moving between pages does not call the server again until the copy is a couple of minutes old.
export const useUnread = create((set, get) => ({
  count: 0,
  loadedAt: 0,

  load: async ({ force = false } = {}) => {
    if (!force && Date.now() - get().loadedAt < FRESH_MS) return
    inFlight ||= api.get('/user/notifications/unread-count')
      .then((res) => set({ count: res.data.data.unread, loadedAt: Date.now() }))
      .catch(() => {})
      .finally(() => { inFlight = null })
    await inFlight
  },

  // Used by the notifications page, which already knows the exact number
  setCount: (count) => set({ count, loadedAt: Date.now() }),

  clear: () => set({ count: 0, loadedAt: 0 }),
}))

// A different sign-in (or a forced logout) must not inherit the previous guest's count
useAuthStore.subscribe((s, prev) => {
  if (s.user?._id !== prev.user?._id) useUnread.getState().clear()
})
