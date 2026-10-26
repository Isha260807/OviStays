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
import PersonalInfo from './pages/Profile/PersonalInfo.jsx'
import SavedGuests from './pages/Profile/SavedGuests.jsx'
import AccountSettings from './pages/Profile/AccountSettings.jsx'
import ContentPage from './pages/Content/ContentPage.jsx'
import VillaSearch from './pages/Search/VillaSearch.jsx'
import Destinations from './pages/Discover/Destinations.jsx'
import Offers from './pages/Discover/Offers.jsx'
import Notifications from './pages/Discover/Notifications.jsx'
import Support from './pages/Discover/Support.jsx'
import Bookings from './pages/Discover/Bookings.jsx'
import NotFound from './pages/Discover/NotFound.jsx'
import MyReviews from './pages/Profile/MyReviews.jsx'
import BillingId from './pages/Profile/BillingId.jsx'
import Preferences from './pages/Profile/Preferences.jsx'
import Security from './pages/Profile/Security.jsx'

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
      <Route path="villas" element={<RequireUser><VillaSearch /></RequireUser>} />
      <Route path="destinations" element={<RequireUser><Destinations /></RequireUser>} />
      <Route path="offers" element={<RequireUser><Offers /></RequireUser>} />
      <Route path="notifications" element={<RequireUser><Notifications /></RequireUser>} />
      <Route path="support" element={<RequireUser><Support /></RequireUser>} />
      <Route path="bookings" element={<RequireUser><Bookings /></RequireUser>} />
      <Route path="villas/:id" element={<RequireUser><VillaDetails /></RequireUser>} />
      <Route path="wishlist" element={<RequireUser><Wishlist /></RequireUser>} />
      <Route path="profile" element={<RequireUser><Profile /></RequireUser>} />
      <Route path="profile/personal" element={<RequireUser><PersonalInfo /></RequireUser>} />
      <Route path="profile/guests" element={<RequireUser><SavedGuests /></RequireUser>} />
      <Route path="profile/settings" element={<RequireUser><AccountSettings /></RequireUser>} />
      <Route path="profile/reviews" element={<RequireUser><MyReviews /></RequireUser>} />
      <Route path="profile/billing" element={<RequireUser><BillingId /></RequireUser>} />
      <Route path="profile/notifications" element={<RequireUser><Preferences /></RequireUser>} />
      <Route path="profile/security" element={<RequireUser><Security /></RequireUser>} />
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

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
