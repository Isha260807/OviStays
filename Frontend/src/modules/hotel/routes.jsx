import { Routes, Route, Navigate } from 'react-router-dom'
import OwnerLayout from './components/OwnerLayout.jsx'
import OwnerAuth from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Villas from './pages/Villas.jsx'
import VillaForm from './pages/VillaForm.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import Bookings from './pages/Bookings.jsx'
import CheckInOut from './pages/CheckInOut.jsx'
import Earnings from './pages/Earnings.jsx'
import Reviews from './pages/Reviews.jsx'
import Notifications from './pages/Notifications.jsx'
import Profile from './pages/Profile.jsx'
import KycPage from './pages/KycPage.jsx'
import AddressPage from './pages/AddressPage.jsx'
import SupportPage from './pages/SupportPage.jsx'
import AboutPage from './pages/AboutPage.jsx'

// Villa owner panel, mounted at /hotel
export default function HotelRoutes() {
  return (
    <Routes>
      <Route path="login" element={<OwnerAuth />} />
      <Route element={<OwnerLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="villas" element={<Villas />} />
        <Route path="villas/new" element={<VillaForm />} />
        <Route path="villas/:id" element={<VillaForm />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="checkin" element={<CheckInOut />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="kyc" element={<KycPage />} />
        <Route path="address" element={<AddressPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/hotel" replace />} />
      </Route>
    </Routes>
  )
}
