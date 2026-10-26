import { create } from 'zustand'
import api from '@/services/api/axios.js'
import { useAuthStore } from '@/core/auth/auth.store.js'

const FRESH_MS = 2 * 60 * 1000

let inFlight = null

// The signed-in guest's full profile, shared by every profile page. It is fetched once and reused
// until it is a couple of minutes old, so opening Profile -> Personal Info -> Security costs one request.
export const useProfile = create((set, get) => ({
  profile: null,
  loadedAt: 0,

  // Resolves to the profile (from the copy when it is fresh). `force` always asks the server.
  load: async ({ force = false } = {}) => {
    const { profile, loadedAt } = get()
    if (!force && profile && Date.now() - loadedAt < FRESH_MS) return profile
    inFlight ||= api.get('/user/profile')
      .then((res) => {
        get().setProfile(res.data.data)
        return res.data.data
      })
      .finally(() => { inFlight = null })
    return inFlight
  },

  // After a save: keep this copy and the one kept in the auth store (name and photo show in the navbar) in step
  setProfile: (profile) => {
    set({ profile, loadedAt: Date.now() })
    const { user, setUser } = useAuthStore.getState()
    if (user) setUser({ ...user, ...profile })
  },

  clear: () => set({ profile: null, loadedAt: 0 }),
}))

// A different sign-in (or a forced logout) must not inherit the previous guest's profile
useAuthStore.subscribe((s, prev) => {
  if (s.user?._id !== prev.user?._id) useProfile.getState().clear()
})
