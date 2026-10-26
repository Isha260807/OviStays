import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// role: 'admin' | 'user' | 'hotel'. Persisted so a refresh keeps the session.
// refreshToken: guests only; swapped for a new access token when the short-lived one expires.
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      role: null,
      setAuth: ({ token, refreshToken = null, user, role }) => set({ token, refreshToken, user, role }),
      setUser: (user) => set({ user }),
      clearAuth: () => set({ token: null, refreshToken: null, user: null, role: null }),
    }),
    { name: 'ovistays-auth' }
  )
)
