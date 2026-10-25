import { Link } from 'react-router-dom'
import { ArrowRight, Star } from 'lucide-react'
import { C, HeartButton, Stars } from './homeUi.jsx'
import { formatPrice } from '../../data/homeData.js'

const villaLink = (id) => `/villas/${id}`
const IMG_ZOOM = 'group-hover:scale-105 transition-transform duration-500'
const CARD_SHADOW = 'shadow-[0_6px_20px_rgba(22,138,211,0.1)]'

// Tall image card with name, city, rating and price over a dark gradient
export function OverlayCard({ villa }) {
  return (
    <Link to={villaLink(villa.id)} className="relative block shrink-0 snap-start w-[150px] h-[220px] lg:w-auto lg:h-[320px] rounded-2xl overflow-hidden group">
      <img src={villa.image} alt={villa.name} loading="lazy" className={`absolute inset-0 w-full h-full object-cover ${IMG_ZOOM}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
      <HeartButton id={villa.id} className="absolute top-2.5 right-2.5" />
      <div className="absolute inset-x-0 bottom-0 p-3 lg:p-4 text-white">
        <h3 className="font-serif-display text-[15px] lg:text-xl font-semibold leading-tight truncate">{villa.name}</h3>
        <p className="text-[11px] lg:text-sm text-white/80">{villa.city}</p>
        <p className="flex items-center gap-1 text-[11px] lg:text-sm mt-0.5">
          <Star className="w-3 h-3" fill="#F5A524" stroke="#F5A524" /> {villa.rating}
        </p>
        <p className="text-sm lg:text-lg font-bold mt-0.5">
          {formatPrice(villa.price)} <span className="text-[10px] lg:text-xs font-normal text-white/75">/ night</span>
        </p>
      </div>
    </Link>
  )
}

// White row card: image left, details right (Best Deals)
export function RowCard({ villa, rail = false }) {
  return (
    <Link to={villaLink(villa.id)} className={`flex gap-3.5 bg-white rounded-2xl p-3 ${rail ? 'shrink-0 snap-start w-[86%] lg:w-auto' : ''} shadow-[0_6px_20px_rgba(22,138,211,0.08)] hover:shadow-[0_10px_28px_rgba(22,138,211,0.14)] transition-shadow`}>
      <img src={villa.image} alt={villa.name} loading="lazy" className="w-[104px] h-[104px] lg:w-36 lg:h-36 rounded-xl object-cover shrink-0" />
      <div className="flex flex-col justify-between min-w-0 flex-1">
        <div>
          <h3 className="font-serif-display text-base lg:text-xl font-semibold leading-tight" style={{ color: C.ink }}>{villa.name}</h3>
          <p className="text-xs lg:text-sm mt-1 leading-snug line-clamp-2" style={{ color: C.muted }}>{villa.location}</p>
        </div>
        <div className="flex items-end justify-between">
          <Stars value={villa.rating} />
          <div className="text-right leading-none">
            <p className="text-lg lg:text-2xl font-bold" style={{ color: C.primaryDark }}>{formatPrice(villa.price)}</p>
            <p className="text-[10px] lg:text-xs mt-0.5" style={{ color: C.muted }}>per night</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

// Portrait card for the wedding collage: name and city on the left, price on its own line
export function MiniCard({ villa }) {
  return (
    <Link to={villaLink(villa.id)} className="relative block rounded-2xl overflow-hidden group min-h-0">
      <img src={villa.image} alt={villa.name} loading="lazy" className={`absolute inset-0 w-full h-full object-cover ${IMG_ZOOM}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/5" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
        <h3 className="font-serif-display text-[11px] lg:text-base font-semibold leading-tight line-clamp-2">{villa.name}</h3>
        <p className="text-[9px] lg:text-xs text-white/75 mt-0.5">{villa.city}</p>
        <p className="text-right text-[11px] lg:text-sm font-bold mt-1.5 whitespace-nowrap">{formatPrice(villa.price)}</p>
      </div>
    </Link>
  )
}

export function FeaturedCard({ villa }) {
  return (
    <Link to={villaLink(villa.id)} className="relative block row-span-2 rounded-2xl overflow-hidden group">
      <img src={villa.image} alt={villa.name} loading="lazy" className={`absolute inset-0 w-full h-full object-cover ${IMG_ZOOM}`} />
      {/* Light white fade at the bottom, dark text on top of it */}
      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-white via-white/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3.5 lg:p-5">
        <h3 className="font-serif-display text-[15px] lg:text-3xl font-semibold leading-tight" style={{ color: C.ink }}>{villa.name}</h3>
        <p className="text-[10px] lg:text-sm mt-1 leading-snug" style={{ color: C.muted }}>{villa.location}</p>
        <p className="text-[15px] lg:text-3xl font-bold mt-2 whitespace-nowrap" style={{ color: C.ink }}>
          {formatPrice(villa.price)} <span className="text-[10px] lg:text-xs font-normal" style={{ color: C.muted }}>/ night</span>
        </p>
      </div>
    </Link>
  )
}

// Photo card: name and city on the photo, price in a frosted-glass footer. Phones show 2.3 cards per screen.
export function PackageCard({ villa }) {
  return (
    <Link to={villaLink(villa.id)} className={`relative block shrink-0 snap-start w-[calc((100vw-2.5rem)/2.3)] h-[205px] lg:w-auto lg:h-[300px] rounded-2xl overflow-hidden ${CARD_SHADOW} group`}>
      <img src={villa.image} alt={villa.name} loading="lazy" className={`absolute inset-0 w-full h-full object-cover ${IMG_ZOOM}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent to-55%" />
      <div className="absolute inset-x-2.5 lg:inset-x-4 bottom-[46px] lg:bottom-[58px] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
        <h3 className="font-serif-display text-[13px] lg:text-xl font-semibold leading-tight truncate">{villa.name}</h3>
        <p className="text-[10px] lg:text-sm text-white/85 truncate">{villa.city} · {villa.tag}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-2.5 lg:px-4 py-2.5 lg:py-3.5 text-white font-bold text-[14px] lg:text-xl whitespace-nowrap bg-white/20 backdrop-blur-md border-t border-white/30 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
        {formatPrice(villa.price)} <span className="text-[9px] lg:text-xs font-normal text-white/90">/ night</span>
      </div>
    </Link>
  )
}

// Destination tile with a round arrow button
export function GatewayCard({ place }) {
  return (
    <Link to={`/villas?city=${encodeURIComponent(place.city)}`} className="relative block shrink-0 snap-start w-[165px] h-[230px] lg:w-auto lg:h-[340px] rounded-2xl overflow-hidden group">
      <img src={place.image} alt={place.city} loading="lazy" className={`absolute inset-0 w-full h-full object-cover ${IMG_ZOOM}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3.5 lg:p-5 text-white">
        <h3 className="font-serif-display text-lg lg:text-2xl font-semibold leading-tight">{place.city}</h3>
        <p className="text-[11px] lg:text-sm text-white/80">{place.tagline}</p>
        <div className="flex items-end justify-between mt-2">
          <div className="leading-tight">
            <p className="text-[10px] text-white/70">From</p>
            <p className="text-base lg:text-xl font-bold">{formatPrice(place.price)}</p>
          </div>
          <span className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center"><ArrowRight className="w-4 h-4" /></span>
        </div>
      </div>
    </Link>
  )
}

// Numbered card (hill retreats)
export function RankedCard({ villa }) {
  return (
    <Link to={villaLink(villa.id)} className={`block shrink-0 snap-start w-[205px] lg:w-auto rounded-2xl overflow-hidden bg-white ${CARD_SHADOW} group`}>
      <div className="relative h-[120px] lg:h-48 overflow-hidden">
        <img src={villa.image} alt={villa.name} loading="lazy" className={`w-full h-full object-cover ${IMG_ZOOM}`} />
      </div>
      <div className="p-3">
        <h3 className="font-serif-display text-[15px] lg:text-lg font-semibold" style={{ color: C.ink }}>{villa.name}</h3>
        <p className="text-xs" style={{ color: C.muted }}>{villa.location}</p>
        <div className="flex items-end justify-between mt-2">
          <Stars value={villa.rating} size="w-2.5 h-2.5" />
          <div className="text-right leading-none">
            <p className="text-base lg:text-lg font-bold" style={{ color: C.primaryDark }}>{villa.price}</p>
            <p className="text-[10px]" style={{ color: C.muted }}>per night</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

// White card with a "From" price (beach villas)
export function FromCard({ villa }) {
  return (
    <Link to={villaLink(villa.id)} className={`block shrink-0 snap-start w-[205px] lg:w-auto rounded-2xl overflow-hidden bg-white ${CARD_SHADOW} group`}>
      <div className="h-[130px] lg:h-48 overflow-hidden">
        <img src={villa.image} alt={villa.name} loading="lazy" className={`w-full h-full object-cover ${IMG_ZOOM}`} />
      </div>
      <div className="p-3">
        <h3 className="font-serif-display text-[15px] lg:text-lg font-semibold" style={{ color: C.ink }}>{villa.name}</h3>
        <p className="text-xs" style={{ color: C.muted }}>{villa.location}</p>
        <div className="flex items-end justify-between mt-2">
          <Stars value={villa.rating} size="w-2.5 h-2.5" />
          <div className="text-right leading-tight">
            <p className="text-[10px]" style={{ color: C.muted }}>From</p>
            <p className="text-base lg:text-lg font-bold" style={{ color: C.primaryDark }}>{formatPrice(villa.price)}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
