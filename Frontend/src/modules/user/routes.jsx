import { Routes, Route, Navigate } from 'react-router-dom'
import { Welcome, Login, Signup, VerifyOtp } from './pages/auth/index.js'
import { Home } from './pages/Home/index.js'
import VillaDetails from './pages/VillaDetails/VillaDetails.jsx'
import BookingSoon from './pages/VillaDetails/BookingSoon.jsx'
import { useEffect } from 'react'
import { useAuthStore } from '@/core/auth/auth.store.js'
import { useWishlist } from '@/core/wishlist/wishlist.store.js'
import Wishlist from './pages/Wishlist/Wishlist.jsx'
import Profile from './pages/Profile/Profile.jsx'
import ContentPage from './pages/Content/ContentPage.jsx'

function AuthRedirect() {
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768
  return <Navigate to={isDesktop ? "/auth/login" : "/auth/welcome"} replace />
}

// Pages for signed-in guests; everyone else goes to the auth screens
function RequireUser({ children }) {
  const signedIn = useAuthStore((s) => Boolean(s.token) && s.role === 'user')
  useEffect(() => {
    if (signedIn) useWishlist.getState().load()
    else useWishlist.getState().clear()
  }, [signedIn])
  return signedIn ? children : <AuthRedirect />
}

export default function UserRoutes() {
  return (
    <Routes>
      <Route index element={<RequireUser><Home /></RequireUser>} />
      <Route path="villas/:id" element={<RequireUser><VillaDetails /></RequireUser>} />
      <Route path="wishlist" element={<RequireUser><Wishlist /></RequireUser>} />
      <Route path="profile" element={<RequireUser><Profile /></RequireUser>} />
      <Route path="pages/:key" element={<RequireUser><ContentPage /></RequireUser>} />
      <Route path="villas/:id/book" element={<RequireUser><BookingSoon /></RequireUser>} />

      {/* User Auth Routes */}
      <Route path="auth" element={<AuthRedirect />} />
      <Route path="auth/welcome" element={<Welcome />} />
      <Route path="auth/login" element={<Login />} />
      <Route path="auth/signup" element={<Signup />} />
      <Route path="auth/verify-otp" element={<VerifyOtp />} />

      {/* Shorthand direct routes */}
      <Route path="welcome" element={<Welcome />} />
      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      <Route path="verify-otp" element={<VerifyOtp />} />

      {/* Fallback to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
