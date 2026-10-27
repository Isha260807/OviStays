import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Welcome, Login, Signup, VerifyOtp } from './pages/auth/index.js'
import { Home } from './pages/Home/index.js'
import VillaDetails from './pages/VillaDetails/VillaDetails.jsx'
import BookingFlow from './pages/Booking/BookingFlow.jsx'
import BookingDetail from './pages/Booking/BookingDetail.jsx'
import { useEffect } from 'react'
import { useAuthStore } from '@/core/auth/auth.store.js'
import { hasSeenWelcome, setPostLoginPath } from '@/core/auth/welcome.js'
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
  const showWelcome = !isDesktop && !hasSeenWelcome()
  return <Navigate to={showWelcome ? "/auth/welcome" : "/auth/login"} replace />
}

// Keeps the saved-villa list in step with the sign-in state
function useWishlistSync() {
  const signedIn = useAuthStore((s) => Boolean(s.token) && s.role === 'user')
  useEffect(() => {
    if (signedIn) useWishlist.getState().load()
    else useWishlist.getState().clear()
  }, [signedIn])
  return signedIn
}

// Browsing (home, search, villa details...) is open to everyone
function Public({ children }) {
  useWishlistSync()
  return children
}

// Booking and account pages need a signed-in guest; everyone else goes to the auth screens and
// comes back here after logging in
function RequireUser({ children }) {
  const signedIn = useWishlistSync()
  const { pathname, search } = useLocation()
  if (signedIn) return children
  setPostLoginPath(pathname + search)
  return <AuthRedirect />
}

export default function UserRoutes() {
  return (
    <Routes>
      <Route index element={<Public><Home /></Public>} />
      <Route path="villas" element={<Public><VillaSearch /></Public>} />
      <Route path="destinations" element={<Public><Destinations /></Public>} />
      <Route path="offers" element={<Public><Offers /></Public>} />
      <Route path="notifications" element={<RequireUser><Notifications /></RequireUser>} />
      <Route path="support" element={<RequireUser><Support /></RequireUser>} />
      <Route path="bookings" element={<RequireUser><Bookings /></RequireUser>} />
      <Route path="bookings/:id" element={<RequireUser><BookingDetail /></RequireUser>} />
      <Route path="villas/:id" element={<Public><VillaDetails /></Public>} />
      <Route path="wishlist" element={<RequireUser><Wishlist /></RequireUser>} />
      <Route path="profile" element={<RequireUser><Profile /></RequireUser>} />
      <Route path="profile/personal" element={<RequireUser><PersonalInfo /></RequireUser>} />
      <Route path="profile/guests" element={<RequireUser><SavedGuests /></RequireUser>} />
      <Route path="profile/settings" element={<RequireUser><AccountSettings /></RequireUser>} />
      <Route path="profile/reviews" element={<RequireUser><MyReviews /></RequireUser>} />
      <Route path="profile/billing" element={<RequireUser><BillingId /></RequireUser>} />
      <Route path="profile/notifications" element={<RequireUser><Preferences /></RequireUser>} />
      <Route path="profile/security" element={<RequireUser><Security /></RequireUser>} />
      <Route path="pages/:key" element={<Public><ContentPage /></Public>} />
      <Route path="villas/:id/book" element={<RequireUser><BookingFlow /></RequireUser>} />

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
