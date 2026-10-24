import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// role: 'admin' | 'user' | 'hotel'. Persisted so a refresh keeps the session.
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      role: null,
      setAuth: ({ token, user, role }) => set({ token, user, role }),
      setUser: (user) => set({ user }),
      clearAuth: () => set({ token: null, user: null, role: null }),
    }),
    { name: 'ovistays-auth' }
  )
)
