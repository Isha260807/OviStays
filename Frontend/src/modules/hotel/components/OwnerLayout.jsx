import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Building2, CalendarDays, CalendarCheck, ClipboardList, KeyRound, LayoutDashboard, LogOut, Menu, Star, UserCircle, Wallet, X } from 'lucide-react'
import { useAuthStore } from '@/core/auth/auth.store.js'
import { logoutUser } from '@/core/auth/logout.js'
import { cn } from '@/shared/utils/cn.js'
import { ownerAPI } from '../services/ownerAPI.js'
import { Pill } from './ui.jsx'

const NAV = [
  { to: '/hotel', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/hotel/villas', label: 'My Villas', icon: Building2 },
  { to: '/hotel/calendar', label: 'Calendar & Pricing', icon: CalendarDays },
  { to: '/hotel/bookings', label: 'Bookings', icon: ClipboardList, badge: 'pending' },
  { to: '/hotel/checkin', label: 'Check-in / Check-out', icon: KeyRound },
  { to: '/hotel/earnings', label: 'Earnings & Payouts', icon: Wallet },
  { to: '/hotel/reviews', label: 'Reviews', icon: Star },
  { to: '/hotel/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
  { to: '/hotel/profile', label: 'Profile', icon: UserCircle },
]

const OPEN_WHEN_UNVERIFIED = ['/hotel/profile', '/hotel/kyc', '/hotel/address', '/hotel/support', '/hotel/about', '/hotel/notifications']

// The phone's bottom bar: the four screens used all day, plus "More" for the rest
const BOTTOM = [
  { to: '/hotel', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/hotel/bookings', label: 'Bookings', icon: ClipboardList, badge: 'pending' },
  { to: '/hotel/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/hotel/villas', label: 'Villas', icon: Building2 },
  { to: '/hotel/profile', label: 'Profile', icon: UserCircle },
]
const BOTTOM_UNVERIFIED = [
  { to: '/hotel/profile', label: 'Profile', icon: UserCircle },
  { to: '/hotel/notifications', label: 'Alerts', icon: Bell, badge: 'unread' },
]

// The shell of the owner panel. Signed-out visitors are sent to the host sign-in page.
export default function OwnerLayout() {
  const { token, role, user } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({ pending: 0, unread: 0 })
  const [kyc, setKyc] = useState(null) // null until the server has told us
  const signedIn = Boolean(token) && role === 'hotel'

  useEffect(() => setOpen(false), [location.pathname])

  // Badges refresh as the owner moves around
  useEffect(() => {
    if (!signedIn) return
    ownerAPI.me().then((me) => {
      setKyc(me.kycStatus)
      if (me.kycStatus !== 'Verified') return ownerAPI.unreadCount().then((n) => setCounts({ pending: 0, unread: n.count }))
      return Promise.all([ownerAPI.bookings({ tab: 'pending', limit: 1 }), ownerAPI.unreadCount()]).then(([b, n]) => setCounts({ pending: b.pendingRequests, unread: n.count }))
    }).catch(() => {})
  }, [signedIn, location.pathname])

  if (!signedIn) return <Navigate to="/hotel/login" replace state={{ from: location.pathname }} />
  if (kyc === null) return <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Loading your account…</div>

  // Until an admin approves the documents, the owner only sees the profile (and notifications) with the review status
  const verified = kyc === 'Verified'
  if (!verified && !OPEN_WHEN_UNVERIFIED.includes(location.pathname.replace(/\/$/, ''))) return <Navigate to="/hotel/profile" replace />
  const nav = verified ? NAV : NAV.filter((n) => ['/hotel/profile', '/hotel/notifications'].includes(n.to))

  const signOut = async () => {
    await logoutUser()
    navigate('/hotel/login', { replace: true })
  }

  const bottom = verified ? BOTTOM : BOTTOM_UNVERIFIED

  const sidebar = (
    <nav className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between px-5 py-5">
        <Link to="/hotel" className="text-lg font-bold text-sky-700">OviStays <span className="text-slate-400 font-medium">Host</span></Link>
        <button type="button" className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="w-5 h-5" /></button>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {nav.map(({ to, label, icon: Icon, end, badge }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium', isActive ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-50')}>
              <Icon className="w-4 h-4" /> <span className="flex-1">{label}</span>
              {badge && counts[badge] > 0 && <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{counts[badge]}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="border-t border-slate-100 p-4">
        <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
        <p className="truncate text-xs text-slate-500">{user?.phone}</p>
        <button type="button" onClick={signOut} className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 cursor-pointer"><LogOut className="w-4 h-4" /> Sign out</button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="cursor-pointer"><Menu className="w-6 h-6" /></button>
          <span className="font-bold text-sky-700">OviStays Host</span>
          <Link to="/hotel/notifications" className="ml-auto relative" aria-label="Notifications"><Bell className="w-5 h-5" />{counts.unread > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500" />}</Link>
        </header>
        <main className="mx-auto w-full max-w-6xl p-4 pb-24 lg:p-8"><Outlet /></main>
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <ul className="mx-auto flex max-w-xl items-stretch">
            {bottom.map(({ to, label, icon: Icon, end, badge }) => (
              <li key={to} className="flex-1">
                <NavLink to={to} end={end} className={({ isActive }) => cn('relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-sky-700' : 'text-slate-500')}>
                  {({ isActive }) => (
                    <>
                      <span className={cn('relative rounded-full px-4 py-1', isActive && 'bg-sky-50')}>
                        <Icon className="h-5 w-5" />
                        {badge && counts[badge] > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{counts[badge]}</span>}
                      </span>
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
