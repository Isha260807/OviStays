import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// role: 'admin' | 'user' | 'hotel'. Persisted so a refresh keeps the session.
// refreshToken: guests and hosts only; swapped for a new access token when the short-lived one expires.
//
// Admin, host and guest sign-ins are kept apart: each area of the site (/admin, /hotel, everything else) has its
// own storage key, so being signed in as an admin in one tab never logs a guest out in another.
export const authAreaOf = (pathname = window.location.pathname) =>
  pathname === '/admin' || pathname.startsWith('/admin/') ? 'admin' : pathname === '/hotel' || pathname.startsWith('/hotel/') ? 'hotel' : 'user'

const keyFor = (area = authAreaOf()) => `ovistays-auth-${area}`

// Chosen at the moment of each read / write, so it follows the page the app is on
const areaStorage = {
  getItem: () => localStorage.getItem(keyFor()),
  setItem: (_name, value) => localStorage.setItem(keyFor(), value),
  removeItem: () => localStorage.removeItem(keyFor()),
}

const EMPTY = { token: null, refreshToken: null, user: null, role: null }

export const useAuthStore = create(
  persist(
    (set) => ({
      ...EMPTY,
      setAuth: ({ token, refreshToken = null, user, role }) => set({ token, refreshToken, user, role }),
      setUser: (user) => set({ user }),
      clearAuth: () => set(EMPTY),
    }),
    { name: 'ovistays-auth', storage: createJSONStorage(() => areaStorage), skipHydration: false }
  )
)

// Moving between areas inside the app (for example from the admin panel to the guest site) swaps in that area's own sign-in
let currentArea = authAreaOf()
export function syncAuthArea(pathname) {
  const next = authAreaOf(pathname)
  if (next === currentArea) return
  currentArea = next
  useAuthStore.setState(EMPTY)
  useAuthStore.persist.rehydrate()
}

// An older version stored everything under one key; move it to the right area once, then drop it
try {
  const legacy = localStorage.getItem('ovistays-auth')
  if (legacy) {
    const role = JSON.parse(legacy)?.state?.role
    const area = role === 'admin' ? 'admin' : role === 'hotel' ? 'hotel' : 'user'
    if (!localStorage.getItem(keyFor(area))) localStorage.setItem(keyFor(area), legacy)
    localStorage.removeItem('ovistays-auth')
    if (area === authAreaOf()) useAuthStore.persist.rehydrate()
  }
} catch { /* a damaged old value is simply ignored */ }
