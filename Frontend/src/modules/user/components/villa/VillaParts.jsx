import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bath, BedDouble, CalendarX, Camera, Check, ChevronLeft, ChevronRight, ChevronDown, Clock, ConciergeBell, CookingPot, CreditCard,
  Dumbbell, Heart, MapPin, Play, Share2, Snowflake, Sparkles, Star, Tv, Users, Utensils, Waves, Wifi, ParkingSquare, X, Map as MapIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { C } from '../home/homeUi.jsx'
import { useWishlist } from '@/core/wishlist/wishlist.store.js'
import { useAuthStore } from '@/core/auth/auth.store.js'
import { setPostLoginPath } from '@/core/auth/welcome.js'
import { formatPrice } from '../../data/homeData.js'

const card = 'bg-white rounded-2xl border shadow-[0_6px_20px_rgba(22,138,211,0.06)]'
const cardBorder = { borderColor: '#E2EDF5' }

const HIGHLIGHT_ICONS = { bed: BedDouble, bath: Bath, guests: Users, wifi: Wifi, parking: ParkingSquare, pool: Waves, ac: Snowflake, kitchen: CookingPot }

// Amenity names are free text, so the icon is picked by a keyword in the name
const AMENITY_ICONS = [
  [/pool|swim/i, Waves], [/restaurant|dining|food|breakfast/i, Utensils], [/wi-?fi|internet/i, Wifi],
  [/park/i, ParkingSquare], [/room service|concierge/i, ConciergeBell], [/\bac\b|air/i, Snowflake],
  [/gym|fitness/i, Dumbbell], [/tv|television/i, Tv], [/kitchen|cook/i, CookingPot],
]
const amenityIcon = (name) => (AMENITY_ICONS.find(([re]) => re.test(name)) || [null, Sparkles])[1]

// ---------- Header actions ----------
export function CircleButton({ children, label, onClick, className = '' }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`w-10 h-10 rounded-full bg-white/95 shadow flex items-center justify-center cursor-pointer hover:bg-white transition-colors ${className}`} style={{ color: C.ink }}>
      {children}
    </button>
  )
}

export function WishButton({ id }) {
  const on = useWishlist((s) => s.ids.includes(id))
  const toggle = useWishlist((s) => s.toggle)
  const navigate = useNavigate()
  const signedIn = useAuthStore((s) => Boolean(s.token))
  const onClick = () => {
    if (!signedIn) {
      setPostLoginPath(window.location.pathname + window.location.search)
      navigate('/auth/login')
      return
    }
    toggle(id)
  }
  return (
    <CircleButton label={on ? 'Remove from favourites' : 'Add to favourites'} onClick={onClick}>
      <Heart className="w-5 h-5" fill={on ? C.primaryDark : 'none'} stroke={on ? C.primaryDark : 'currentColor'} />
    </CircleButton>
  )
}

export function ShareButton({ title }) {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title, url })
      else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }
    } catch { /* the guest closed the share sheet */ }
  }
  return (
    <span className="relative">
      <CircleButton label="Share" onClick={share}><Share2 className="w-5 h-5" /></CircleButton>
      {copied && <span className="absolute right-0 top-12 whitespace-nowrap rounded-lg bg-black/80 px-2.5 py-1 text-xs text-white">Link copied</span>}
    </span>
  )
}

// ---------- Photos ----------
export function Lightbox({ photos, start, onClose }) {
  const [i, setI] = useState(start)
  const next = useCallback(() => setI((x) => (x + 1) % photos.length), [photos.length])
  const prev = useCallback(() => setI((x) => (x - 1 + photos.length) % photos.length), [photos.length])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [next, prev, onClose])

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Photo viewer">
      <img src={photos[i].url} alt={photos[i].category} className="max-h-full max-w-full object-contain" />
      <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer"><X className="w-5 h-5" /></button>
      {photos.length > 1 && (
        <>
          <button type="button" onClick={prev} aria-label="Previous photo" className="absolute left-3 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer"><ChevronLeft className="w-5 h-5" /></button>
          <button type="button" onClick={next} aria-label="Next photo" className="absolute right-3 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer"><ChevronRight className="w-5 h-5" /></button>
        </>
      )}
      <span className="absolute bottom-5 rounded-full bg-black/50 px-3 py-1 text-sm text-white">{i + 1} / {photos.length} · {photos[i].category}</span>
    </div>
  )
}

export function VideoModal({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Villa video">
      <video src={src} controls autoPlay playsInline className="max-h-full max-w-full rounded-xl" />
      <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer"><X className="w-5 h-5" /></button>
    </div>
  )
}

// Main photo with a counter, and a row of thumbnails that picks it
export function PhotoHeader({ photos, active, onActive, onOpen, overlay }) {
  const main = photos[active] || photos[0]
  return (
    <div>
      <div className="relative h-[300px] md:h-[420px] lg:h-[460px] md:rounded-3xl overflow-hidden bg-[#DDF3FF]">
        {main && (
          <button type="button" onClick={() => onOpen(active)} aria-label="Open photo" className="absolute inset-0 w-full h-full cursor-zoom-in">
            <img src={main.url} alt={main.category} className="w-full h-full object-cover" />
          </button>
        )}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent pointer-events-none" />
        {overlay}
        {photos.length > 0 && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            <Camera className="w-3.5 h-3.5" /> {active + 1}/{photos.length}
          </span>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto px-4 md:px-0 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {photos.map((p, i) => (
            <button key={`${p.url}-${i}`} type="button" onClick={() => onActive(i)} aria-label={`Photo ${i + 1}`}
              className={`shrink-0 w-[62px] h-[62px] md:w-20 md:h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition-colors ${i === active ? '' : 'border-transparent opacity-80'}`}
              style={i === active ? { borderColor: C.primaryDark } : undefined}>
              <img src={p.url} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Title and quick facts ----------
export function Rating({ value, count }) {
  if (!value) return null
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-bold" style={{ background: C.peach, color: C.ink }}>
      <Star className="w-3.5 h-3.5" fill="#F5A524" stroke="#F5A524" /> {value}
      {count > 0 && <span className="text-xs font-normal" style={{ color: C.muted }}>({count} {count === 1 ? 'review' : 'reviews'})</span>}
    </span>
  )
}

export function Highlights({ items }) {
  if (!items.length) return null
  return (
    <div className={`${card} grid divide-x py-4`} style={{ ...cardBorder, gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((h, i) => {
        const Icon = HIGHLIGHT_ICONS[h.icon] || BedDouble
        return (
          <div key={i} className="flex flex-col items-center text-center px-2" style={{ borderColor: '#E2EDF5' }}>
            <Icon className="w-6 h-6 mb-1.5" style={{ color: C.primaryDark }} />
            <p className="text-sm font-bold" style={{ color: C.ink }}>{h.title}</p>
            {h.subtitle && <p className="text-[11px]" style={{ color: C.muted }}>{h.subtitle}</p>}
          </div>
        )
      })}
    </div>
  )
}

// ---------- About ----------
export function About({ villa, onPlay }) {
  const [open, setOpen] = useState(false)
  const long = villa.description.length > 220
  return (
    <section>
      <h2 className="font-serif-display text-xl lg:text-2xl font-bold mb-2" style={{ color: C.ink }}>About This Property</h2>
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          {villa.description ? (
            <p className={`text-sm lg:text-base leading-relaxed whitespace-pre-line ${open ? '' : 'line-clamp-6'}`} style={{ color: C.muted }}>{villa.description}</p>
          ) : (
            <p className="text-sm" style={{ color: C.muted }}>No description yet.</p>
          )}
          {long && (
            <button type="button" onClick={() => setOpen(!open)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold cursor-pointer" style={{ color: C.primaryDark }}>
              {open ? 'Show less' : 'Read More'} <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        {villa.video && villa.photos[0] && (
          <button type="button" onClick={onPlay} aria-label="Play villa video" className="relative shrink-0 w-[96px] h-[96px] lg:w-36 lg:h-36 rounded-xl overflow-hidden cursor-pointer">
            <img src={villa.photos[0].url} alt="" className="w-full h-full object-cover" />
            <span className="absolute inset-0 bg-black/25 flex items-center justify-center">
              <span className="w-9 h-9 rounded-full bg-black/55 text-white flex items-center justify-center"><Play className="w-4 h-4" fill="#fff" /></span>
            </span>
          </button>
        )}
      </div>
    </section>
  )
}

export function Amenities({ items }) {
  if (!items.length) return null
  return (
    <section>
      <h2 className="font-serif-display text-xl lg:text-2xl font-bold mb-3" style={{ color: C.ink }}>Amenities</h2>
      <div className="-mx-4 px-4 md:mx-0 md:px-0 flex md:flex-wrap gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((a) => {
          const Icon = amenityIcon(a.name)
          return (
            <div key={a.id} className={`${card} shrink-0 w-[84px] md:w-28 py-3 px-1.5 flex flex-col items-center gap-1.5 text-center`} style={cardBorder}>
              <Icon className="w-6 h-6" style={{ color: C.primaryDark }} />
              <span className="text-[11px] md:text-xs leading-tight font-medium" style={{ color: C.ink }}>{a.name}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// Rooms and spaces of the villa, for information only (the whole villa is booked together)
export function Spaces({ items }) {
  if (!items.length) return null
  return (
    <section>
      <h2 className="font-serif-display text-xl lg:text-2xl font-bold mb-3" style={{ color: C.ink }}>Inside the Villa</h2>
      <div className="-mx-4 px-4 md:mx-0 md:px-0 flex md:grid md:grid-cols-2 gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((s, i) => (
          <div key={i} className={`${card} shrink-0 w-[260px] md:w-auto p-3 flex gap-3`} style={cardBorder}>
            {s.image && <img src={s.image} alt={s.name} loading="lazy" className="w-20 h-20 rounded-xl object-cover shrink-0" />}
            <div className="min-w-0">
              <h3 className="font-serif-display text-base font-semibold" style={{ color: C.ink }}>{s.name}</h3>
              {s.details && <p className="text-xs mt-1 leading-snug" style={{ color: C.muted }}>{s.details}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function Policies({ policies }) {
  const rows = [
    { icon: Clock, label: 'Check-in', value: policies.checkIn },
    { icon: Clock, label: 'Check-out', value: policies.checkOut },
    { icon: CalendarX, label: 'Cancellation', value: policies.cancellation },
    { icon: CreditCard, label: 'Payment', value: policies.payment },
  ].filter((r) => r.value)
  if (!rows.length) return null
  return (
    <section>
      <h2 className="font-serif-display text-xl lg:text-2xl font-bold mb-3" style={{ color: C.ink }}>Villa Policies</h2>
      <div className={`${card} grid grid-cols-2 gap-x-4 gap-y-5 p-4`} style={cardBorder}>
        {rows.map((r) => (
          <div key={r.label} className="flex gap-2.5">
            <r.icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.primaryDark }} />
            <div>
              <p className="text-xs" style={{ color: C.muted }}>{r.label}</p>
              <p className="text-sm font-semibold" style={{ color: C.ink }}>{r.value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function Location({ villa }) {
  const href = villa.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${villa.name} ${villa.location}`)}`
  return (
    <section>
      <div className={`${card} flex items-center justify-between gap-3 p-4`} style={cardBorder}>
        <div className="flex gap-2.5 min-w-0">
          <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.primaryDark }} />
          <div className="min-w-0">
            <p className="font-serif-display text-base font-semibold" style={{ color: C.ink }}>Location</p>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>{villa.location}</p>
          </div>
        </div>
        <a href={href} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold" style={{ color: C.primaryDark, borderColor: C.primary, background: C.cream }}>
          <MapIcon className="w-4 h-4" /> View on Map
        </a>
      </div>
    </section>
  )
}

// ---------- Gallery tab ----------
export function GalleryTab({ photos, onOpen }) {
  const [category, setCategory] = useState('All')
  const categories = useMemo(() => {
    const counts = {}
    for (const p of photos) counts[p.category] = (counts[p.category] || 0) + 1
    return Object.entries(counts)
  }, [photos])
  const shown = photos.map((p, index) => ({ ...p, index })).filter((p) => category === 'All' || p.category === category)

  if (!photos.length) return <p className="text-sm" style={{ color: C.muted }}>No photos yet.</p>
  const chip = (active) => `shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border cursor-pointer transition-colors ${active ? 'text-white' : 'bg-white'}`
  return (
    <section>
      <h2 className="font-serif-display text-xl lg:text-2xl font-bold mb-3" style={{ color: C.ink }}>
        Photo Gallery <span className="text-sm font-sans font-normal" style={{ color: C.muted }}>({photos.length} {photos.length === 1 ? 'Photo' : 'Photos'})</span>
      </h2>
      <div className="-mx-4 px-4 md:mx-0 md:px-0 flex gap-2 overflow-x-auto mb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => setCategory('All')} className={chip(category === 'All')} style={category === 'All' ? { background: C.primaryDark, borderColor: C.primaryDark } : { borderColor: '#E2EDF5', color: C.ink }}>All ({photos.length})</button>
        {categories.map(([name, n]) => (
          <button key={name} type="button" onClick={() => setCategory(name)} className={chip(category === name)} style={category === name ? { background: C.primaryDark, borderColor: C.primaryDark } : { borderColor: '#E2EDF5', color: C.ink }}>{name} ({n})</button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {shown.map((p) => (
          <button key={`${p.url}-${p.index}`} type="button" onClick={() => onOpen(p.index)} className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group">
            <img src={p.url} alt={p.category} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <span className="absolute left-2 bottom-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">{p.category}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

// ---------- Reviews tab ----------
const stars = (n, size = 'w-3.5 h-3.5') => (
  <span className="flex gap-0.5" aria-label={`${n} out of 5`}>
    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={size} fill={i <= Math.round(n) ? '#F5A524' : 'none'} stroke={i <= Math.round(n) ? '#F5A524' : '#CBD5E1'} />)}
  </span>
)

const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
const ago = (date) => {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days < 1) return 'Today'
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''} ago`
  if (days < 365) return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''} ago`
  return new Date(date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

export function ReviewsTab({ reviews }) {
  if (!reviews.count) {
    return (
      <section>
        <h2 className="font-serif-display text-xl lg:text-2xl font-bold mb-2" style={{ color: C.ink }}>Guest Reviews</h2>
        <p className="text-sm" style={{ color: C.muted }}>No reviews yet.</p>
      </section>
    )
  }
  return (
    <section>
      <h2 className="font-serif-display text-xl lg:text-2xl font-bold" style={{ color: C.ink }}>Guest Reviews</h2>
      <p className="text-sm mb-4" style={{ color: C.muted }}>What guests say about this villa</p>

      <div className={`${card} p-4 flex items-center gap-5`} style={cardBorder}>
        <div className="text-center shrink-0">
          <p className="font-serif-display text-4xl font-bold" style={{ color: C.ink }}>{reviews.average}</p>
          {stars(reviews.average, 'w-4 h-4')}
          <p className="text-xs mt-1" style={{ color: C.muted }}>{reviews.count} {reviews.count === 1 ? 'review' : 'reviews'}</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n} className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
              <span className="w-3">{n}</span>
              <span className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: C.peach }}>
                <span className="block h-full rounded-full" style={{ width: `${(reviews.distribution[n] / reviews.count) * 100}%`, background: C.primary }} />
              </span>
              <span className="w-6 text-right">{reviews.distribution[n]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {reviews.items.map((r) => (
          <article key={r.id} className={`${card} p-4`} style={cardBorder}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: C.peach, color: C.primaryDark }}>{initials(r.name)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: C.ink }}>
                    {r.name}
                    {r.verified && <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 align-middle"><Check className="w-3 h-3" /> Verified Stay</span>}
                  </p>
                  <p className="text-xs" style={{ color: C.muted }}>{ago(r.date)}</p>
                </div>
              </div>
              {stars(r.rating)}
            </div>
            {r.comment && <p className="mt-3 text-sm leading-relaxed" style={{ color: C.ink }}>{r.comment}</p>}
          </article>
        ))}
      </div>
    </section>
  )
}

// ---------- Booking bar ----------
export function PriceBlock({ price, className = '', note = 'Total price for the whole villa' }) {
  return (
    <div className={className}>
      <p className="text-lg lg:text-3xl font-bold leading-none whitespace-nowrap" style={{ color: C.ink }}>
        {formatPrice(price)} <span className="text-xs lg:text-sm font-normal" style={{ color: C.muted }}>/ night</span>
      </p>
      <p className="text-[10px] lg:text-[11px] mt-1" style={{ color: C.muted }}>{note}</p>
    </div>
  )
}
