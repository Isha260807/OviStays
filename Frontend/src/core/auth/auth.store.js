import { create } from 'zustand'

// role: 'admin' | 'user' | 'hotel'
export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  setAuth: (user, role) => set({ user, role }),
  clearAuth: () => set({ user: null, role: null }),
}))
