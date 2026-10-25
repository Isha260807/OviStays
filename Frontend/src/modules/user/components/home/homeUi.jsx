import { Link } from 'react-router-dom'
import { ArrowRight, Heart, Star } from 'lucide-react'
import { useWishlist } from '@/core/wishlist/wishlist.store.js'

// Home page palette: same blue theme as the auth pages (shared/styles/auth.css)
export const C = {
  primary: '#55B8F5',
  primaryDark: '#168AD3',
  cream: '#F5FAFE',
  peach: '#DDF3FF',
  ink: '#111111',
  muted: '#6B7280',
}

export function SectionHeader({ title, subtitle, to = '/villas', action = 'See all' }) {
  return (
    <div className="flex items-end justify-between mb-4 lg:mb-6">
      <div>
        <h2 className="font-serif-display text-[1.45rem] lg:text-3xl font-bold leading-tight" style={{ color: C.ink }}>
          {title}
        </h2>
        {subtitle && <p className="text-xs lg:text-sm mt-0.5" style={{ color: C.muted }}>{subtitle}</p>}
      </div>
      {action && (
        <Link to={to} className="flex items-center gap-1 text-sm lg:text-[15px] font-semibold hover:opacity-80" style={{ color: C.primaryDark }}>
          {action} <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}

// Horizontal swipe row on mobile, a grid from lg up
export function Rail({ children, cols = 'lg:grid-cols-4' }) {
  return (
    <div className={`-mx-4 px-4 lg:mx-0 lg:px-0 flex gap-2.5 lg:gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 lg:scroll-px-0 pb-2 lg:pb-0 lg:grid ${cols} lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
      {children}
    </div>
  )
}

export function HeartButton({ id, className = '' }) {
  const on = useWishlist((s) => s.ids.includes(id))
  const toggleWish = useWishlist((s) => s.toggle)
  const toggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWish(id)
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? 'Remove from favourites' : 'Add to favourites'}
      className={`w-8 h-8 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-colors cursor-pointer ${className}`}
    >
      <Heart className="w-4 h-4" fill={on ? '#fff' : 'none'} />
    </button>
  )
}

export function Stars({ value = 5, size = 'w-3 h-3' }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value} stars`}>
      {Array.from({ length: Math.round(value) }).map((_, i) => (
        <Star key={i} className={size} fill={C.primaryDark} stroke={C.primaryDark} />
      ))}
    </span>
  )
}
