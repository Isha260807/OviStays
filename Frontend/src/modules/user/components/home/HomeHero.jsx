import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, MapPin, Search, Users } from 'lucide-react'
import { C } from './homeUi.jsx'
import { DEFAULT_HERO } from '../../data/homeData.js'

const FIELD = 'w-full bg-transparent outline-none text-sm font-semibold placeholder:font-normal placeholder:text-[#9CA3AF]'

function useVillaSearch() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ q: '', checkIn: '', checkOut: '', guests: '2' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams(Object.entries(form).filter(([, v]) => v))
    navigate(`/villas?${params}`)
  }
  return { form, set, submit }
}

// Phone: one rounded search pill
export function MobileSearch() {
  const { form, set, submit } = useVillaSearch()
  return (
    <form onSubmit={submit} className="md:hidden flex items-center gap-2.5 bg-white rounded-full pl-4 pr-1.5 py-1.5 border border-[#BFDDF0] shadow-[0_1px_3px_rgba(17,17,17,0.12)]">
      <Search className="w-4 h-4 shrink-0" style={{ color: C.ink }} />
      <input value={form.q} onChange={set('q')} placeholder="Search villas, cities or places..." className={`${FIELD} py-1`} aria-label="Search villas" />
      <button type="submit" aria-label="Search" className="w-9 h-9 shrink-0 rounded-full text-white flex items-center justify-center cursor-pointer" style={{ background: C.primary }}>
        <Search className="w-4 h-4" />
      </button>
    </form>
  )
}

// Tablet / desktop: location, dates and guests in one panel
function DesktopSearch() {
  const { form, set, submit } = useVillaSearch()
  const box = 'flex items-center gap-3 px-5 py-3 border-r last:border-r-0'
  const label = 'text-[11px] font-bold uppercase tracking-wider'
  return (
    <form onSubmit={submit} className="hidden md:grid grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] items-center bg-white rounded-3xl p-2.5 shadow-[0_18px_50px_rgba(22,138,211,0.18)]" style={{ color: C.ink }}>
      <label className={box} style={{ borderColor: C.peach }}>
        <MapPin className="w-5 h-5 shrink-0" style={{ color: C.primaryDark }} />
        <span className="flex-1">
          <span className={label} style={{ color: C.primaryDark }}>Location</span>
          <input value={form.q} onChange={set('q')} placeholder="City, villa or place" className={FIELD} />
        </span>
      </label>
      <label className={box} style={{ borderColor: C.peach }}>
        <CalendarDays className="w-5 h-5 shrink-0" style={{ color: C.primaryDark }} />
        <span className="flex-1">
          <span className={label} style={{ color: C.primaryDark }}>Check-in</span>
          <input type="date" value={form.checkIn} onChange={set('checkIn')} className={FIELD} />
        </span>
      </label>
      <label className={box} style={{ borderColor: C.peach }}>
        <CalendarDays className="w-5 h-5 shrink-0" style={{ color: C.primaryDark }} />
        <span className="flex-1">
          <span className={label} style={{ color: C.primaryDark }}>Check-out</span>
          <input type="date" value={form.checkOut} onChange={set('checkOut')} className={FIELD} />
        </span>
      </label>
      <label className={box} style={{ borderColor: C.peach }}>
        <Users className="w-5 h-5 shrink-0" style={{ color: C.primaryDark }} />
        <span className="flex-1">
          <span className={label} style={{ color: C.primaryDark }}>Guests</span>
          <select value={form.guests} onChange={set('guests')} className={FIELD}>
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15].map((n) => <option key={n} value={n}>{n} Guest{n > 1 ? 's' : ''}</option>)}
          </select>
        </span>
      </label>
      <button type="submit" className="ml-2 h-14 px-8 rounded-2xl text-white font-semibold flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity" style={{ background: C.primary }}>
        <Search className="w-5 h-5" /> Search
      </button>
    </form>
  )
}

export default function HomeHero({ hero }) {
  const h = { ...DEFAULT_HERO, ...Object.fromEntries(Object.entries(hero || {}).filter(([, v]) => v)) }
  return (
    <section className="relative">
      {/* Full-width image with a white fade behind the text on the left */}
      <div className="relative h-[370px] md:h-[500px] lg:h-[560px] w-full overflow-hidden">
        <img src={h.image} alt="Luxury villa" className="absolute inset-0 w-full h-full object-cover object-[75%_center] md:object-center" />
        <div className="absolute inset-0 md:hidden bg-gradient-to-r from-[#F5FAFE]/95 from-0% via-[#F5FAFE]/65 via-45% to-transparent to-75%" />
        {/* Desktop: the fade starts at the text column (left edge of the centered container), not the screen edge */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{ background: 'linear-gradient(to right, rgba(245,250,254,0.9) 0, rgba(245,250,254,0.9) calc(max(0px, (100% - 1360px) / 2) + 120px), rgba(245,250,254,0.55) calc(max(0px, (100% - 1360px) / 2) + 520px), rgba(245,250,254,0) calc(max(0px, (100% - 1360px) / 2) + 820px))' }}
        />
        <div className="absolute inset-x-0 bottom-0 hidden md:block md:h-14 bg-gradient-to-t from-[#F5FAFE] to-transparent" />

        <div className="relative h-full max-w-[1360px] mx-auto px-4 md:px-6 lg:px-10 flex items-center">
          <Link to="/notifications" aria-label="Notifications" className="md:hidden absolute top-5 right-5 w-11 h-11 rounded-full bg-white/90 flex items-center justify-center shadow" style={{ color: C.ink }}>
            <Bell className="w-5 h-5" />
          </Link>

          <div className="max-w-[560px] pb-6 md:pb-16">
            <p className="font-serif-display italic text-[15px] md:text-xl mb-3" style={{ color: C.primaryDark }}>{h.eyebrow}</p>
            <h1 className="font-serif-display text-[1.9rem] min-[400px]:text-[2.2rem] md:text-6xl lg:text-7xl font-bold leading-[1.05]" style={{ color: C.ink }}>
              {h.line1}<br />{h.line2}<br />
              <span style={{ color: C.primaryDark }}>{h.line3}</span>
            </h1>
            <p className="mt-4 text-sm md:text-lg max-w-[250px] md:max-w-md leading-relaxed" style={{ color: C.muted }}>
              {h.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Search overlaps the hero edge on desktop */}
      <div className="px-4 md:px-6 lg:px-10 mt-5 md:-mt-10 relative z-10 max-w-[1360px] mx-auto">
        <MobileSearch />
        <DesktopSearch />
      </div>
    </section>
  )
}
