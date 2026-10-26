import { Link } from 'react-router-dom'
import { HomeNavbar, BottomNav } from '../../components/home/HomeNav.jsx'
import { C } from '../../components/home/homeUi.jsx'

export default function NotFound() {
  return (
    <div className="min-h-screen pb-24 md:pb-0 antialiased" style={{ background: C.cream, color: C.ink }}>
      <HomeNavbar />
      <main className="max-w-md mx-auto px-6 py-24 text-center">
        <p className="font-serif-display text-7xl font-bold" style={{ color: C.primary }}>404</p>
        <h1 className="font-serif-display text-2xl font-bold mt-3">This page could not be found</h1>
        <p className="mt-2 text-sm" style={{ color: C.muted }}>The link may be old or mistyped. Let us take you somewhere useful.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ background: C.primary }}>Go home</Link>
          <Link to="/villas" className="rounded-full border bg-white px-6 py-2.5 text-sm font-semibold" style={{ borderColor: '#E2EDF5' }}>Browse villas</Link>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
