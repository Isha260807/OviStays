import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Briefcase, ChevronRight, FileText, Heart, LifeBuoy, Lock, LogOut, Phone, Settings, ShieldCheck, Star, User, Users } from 'lucide-react'
import { assetUrl } from '@/services/api/config.js'
import { useAuthStore } from '@/core/auth/auth.store.js'
import { logoutUser } from '@/core/auth/logout.js'
import { useProfile } from '@/core/profile/profile.store.js'
import { useWishlist } from '@/core/wishlist/wishlist.store.js'
import { HomeNavbar, BottomNav } from '../../components/home/HomeNav.jsx'
import { C } from '../../components/home/homeUi.jsx'
import { card, cardBorder } from '../../components/account/AccountUi.jsx'

const MENU = [
  { to: '/profile/personal', icon: User, title: 'Personal Information', subtitle: 'Name, email, photo and date of birth' },
  { to: '/bookings', icon: Briefcase, title: 'My Bookings', subtitle: 'Upcoming, past and cancelled stays' },
  { to: '/wishlist', icon: Heart, title: 'My Wishlist', subtitle: 'Saved favourite villas' },
  { to: '/profile/reviews', icon: Star, title: 'My Reviews', subtitle: 'Ratings you gave after your stays' },
  { to: '/profile/guests', icon: Users, title: 'Saved Guest Details', subtitle: 'Traveller names and contact details' },
  { to: '/profile/billing', icon: FileText, title: 'Billing & ID', subtitle: 'GST details and ID proof for check-in' },
  { to: '/profile/notifications', icon: Bell, title: 'Notification Settings', subtitle: 'Choose what we send and how' },
  { to: '/profile/security', icon: Lock, title: 'Login & Security', subtitle: 'Verify email and manage your devices' },
  { to: '/support', icon: LifeBuoy, title: 'Help & Support', subtitle: 'FAQs and talk to our team' },
  { to: '/profile/settings', icon: Settings, title: 'Settings & Policies', subtitle: 'Terms, privacy and your account' },
]

function MenuRow({ to, icon: Icon, title, subtitle, onClick, danger, badge }) {
  const inner = (
    <>
      <span className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center" style={{ background: danger ? '#FEE2E2' : C.peach, color: danger ? '#DC2626' : C.primaryDark }}>
        <Icon className="w-5 h-5" />
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-[15px] font-semibold" style={{ color: danger ? '#DC2626' : C.ink }}>{title}{badge ? <span className="ml-1.5 text-xs font-normal" style={{ color: C.muted }}>{badge}</span> : null}</span>
        {subtitle && <span className="block text-xs mt-0.5" style={{ color: C.muted }}>{subtitle}</span>}
      </span>
      {!danger && <ChevronRight className="w-4 h-4 shrink-0" style={{ color: C.muted }} />}
    </>
  )
  const cls = `${card} flex items-center gap-3.5 w-full p-3.5 hover:shadow-[0_8px_24px_rgba(22,138,211,0.12)] transition-shadow`
  return to
    ? <Link to={to} className={cls} style={cardBorder}>{inner}</Link>
    : <button type="button" onClick={onClick} className={`${cls} cursor-pointer`} style={cardBorder}>{inner}</button>
}

// The profile menu: each row opens its own page
export default function Profile() {
  const navigate = useNavigate()
  const authUser = useAuthStore((s) => s.user)
  const favourites = useWishlist((s) => s.ids.length)

  // Keep the saved copy (name, photo) fresh; the store only asks the server when its copy is old
  useEffect(() => { useProfile.getState().load().catch(() => {}) }, [])

  const logout = () => {
    logoutUser()
    navigate('/auth/login', { replace: true })
  }

  const initial = (authUser?.name || 'G').trim().charAt(0).toUpperCase()

  return (
    <div className="min-h-screen pb-24 md:pb-0 antialiased" style={{ background: C.cream, color: C.ink }}>
      <HomeNavbar />
      <main className="max-w-[640px] mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-6">
        <h1 className="font-serif-display text-2xl lg:text-3xl font-bold mb-5">My Profile</h1>

        <section className={`${card} p-5 flex items-center gap-4`} style={cardBorder}>
          <span className="w-[72px] h-[72px] shrink-0 rounded-full overflow-hidden ring-4 ring-white shadow-[0_4px_14px_rgba(22,138,211,0.25)] flex items-center justify-center text-2xl font-bold text-white" style={{ background: C.primary }}>
            {authUser?.photo ? <img src={assetUrl(authUser.photo)} alt="Your photo" className="w-full h-full object-cover" /> : initial}
          </span>
          <div className="min-w-0">
            <h2 className="font-serif-display text-xl font-bold truncate">{authUser?.name || 'Guest'}</h2>
            <p className="flex items-center gap-1.5 text-sm mt-0.5" style={{ color: C.muted }}><Phone className="w-3.5 h-3.5" /> {authUser?.phone}</p>
            <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Account
            </span>
          </div>
        </section>

        <div className="mt-5 space-y-3">
          {MENU.map((m) => (
            <MenuRow key={m.to} {...m} badge={m.to === '/wishlist' && favourites ? `(${favourites})` : ''} />
          ))}
          <MenuRow icon={LogOut} title="Log out" onClick={logout} danger />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
