import { Link, useParams } from 'react-router-dom'
import { HomeNavbar } from '../../components/home/HomeNav.jsx'
import { C } from '../../components/home/homeUi.jsx'

// Placeholder until the booking flow (dates, guests, payment) is built
export default function BookingSoon() {
  const { id } = useParams()
  return (
    <div className="min-h-screen antialiased" style={{ background: C.cream, color: C.ink }}>
      <HomeNavbar />
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <h1 className="font-serif-display text-2xl font-bold">Booking is coming soon</h1>
        <p className="mt-2 text-sm" style={{ color: C.muted }}>You will be able to pick dates and book the whole villa here very soon.</p>
        <Link to={`/villas/${id}`} className="inline-block mt-5 rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ background: C.primary }}>Back to the villa</Link>
      </div>
    </div>
  )
}
