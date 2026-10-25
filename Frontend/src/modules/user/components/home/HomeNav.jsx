import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Bell, Compass, Briefcase, Heart, User, LogOut } from 'lucide-react'
import { useAuthStore } from '@/core/auth/auth.store.js'
import { C } from './homeUi.jsx'

const DESKTOP_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Villas', to: '/villas' },
  { label: 'Destinations', to: '/destinations' },
  { label: 'Offers', to: '/offers' },
  { label: 'Support', to: '/support' },
]

const TABS = [
  { label: 'Explore', to: '/', icon: Compass },
  { label: 'Bookings', to: '/bookings', icon: Briefcase },
  { label: 'Favourites', to: '/wishlist', icon: Heart },
  { label: 'Profile', to: '/profile', icon: User },
]

export function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center text-lg" style={{ background: C.primary }}>O</span>
      <span className="font-serif-display text-xl font-bold" style={{ color: light ? '#fff' : C.ink }}>
        Ovi<span style={{ color: C.primaryDark }}>Stays</span>
      </span>
    </Link>
  )
}

// Top bar for tablet / desktop
export function HomeNavbar() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const initial = (user?.name || 'G').trim().charAt(0).toUpperCase()

  const logout = () => {
    clearAuth()
    navigate('/auth/login', { replace: true })
  }

  return (
    <header className="hidden md:block sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: 'rgba(245,250,254,0.92)', borderColor: C.peach }}>
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 h-[72px] flex items-center justify-between gap-6">
        <Logo />
        <nav className="flex items-center gap-1 lg:gap-2">
          {DESKTOP_LINKS.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              end={l.to === '/'}
              className="px-3.5 py-2 rounded-full text-sm font-semibold transition-colors"
              style={({ isActive }) => ({ color: isActive ? C.primaryDark : C.muted, background: isActive ? C.peach : 'transparent' })}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/notifications" aria-label="Notifications" className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow" style={{ color: C.ink }}>
            <Bell className="w-5 h-5" />
          </Link>
          <Link to="/profile" className="flex items-center gap-2 rounded-full bg-white pl-1.5 pr-4 py-1.5 shadow-sm hover:shadow">
            <span className="w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center" style={{ background: C.primary }}>{initial}</span>
            <span className="text-sm font-semibold max-w-[110px] truncate" style={{ color: C.ink }}>{user?.name || 'Guest'}</span>
          </Link>
          <button type="button" onClick={logout} aria-label="Log out" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white cursor-pointer" style={{ color: C.muted }}>
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

// Fixed tab bar for phones
export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-[#F5FAFE]/95 backdrop-blur-md" style={{ borderColor: C.peach }}>
      <ul className="grid grid-cols-4 max-w-md mx-auto">
        {TABS.map(({ label, to, icon: Icon }) => (
          <li key={label}>
            <NavLink to={to} end={to === '/'} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold" style={({ isActive }) => ({ color: isActive ? C.primaryDark : C.muted })}>
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
