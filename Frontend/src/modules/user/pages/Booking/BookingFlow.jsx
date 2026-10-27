import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, CalendarRange, ChevronLeft, Minus, Moon, Plus, Sun, SunMoon, Tag } from 'lucide-react'
import { toast } from 'sonner'
import api, { errorMessage } from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'
import { HomeNavbar } from '../../components/home/HomeNav.jsx'
import { C } from '../../components/home/homeUi.jsx'
import { useVillaDetails } from '../../hooks/useVillaDetails.js'
import DateRangePicker from '../../components/booking/DateRangePicker.jsx'
import { PriceBreakdown, border } from '../../components/booking/BookingParts.jsx'
import { MODE_LABEL, formatPaise, fullDate, localTimeOf, todayStr, addDays } from '@/shared/utils/booking.js'

const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random())

// The five ways to book the whole villa. A type the villa does not offer stays visible but cannot be picked.
const MODE_ORDER = ['day', 'night', 'fullDayNight', 'weekly', 'monthly']
const RANGE_MODES = ['night', 'weekly', 'monthly']
const MODE_INFO = {
  day: { icon: Sun, hint: () => 'Daytime only' },
  night: { icon: Moon, hint: () => 'Overnight stay' },
  fullDayNight: { icon: SunMoon, hint: () => 'Day + night' },
  weekly: { icon: CalendarDays, hint: (c) => `${c.minNights}+ nights` },
  monthly: { icon: CalendarRange, hint: (c) => `${c.minNights}+ nights` },
}

function ModeCards({ cfg, mode, onChange }) {
  return (
    <div role="radiogroup" aria-label="Booking type" className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
      {MODE_ORDER.map((m, i) => {
        const { icon: Icon, hint } = MODE_INFO[m]
        const on = mode === m
        const offered = Boolean(cfg[m]?.enabled)
        return (
          <button key={m} type="button" role="radio" aria-checked={on} disabled={!offered} onClick={() => onChange(m)}
            className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55B8F5] disabled:cursor-not-allowed disabled:opacity-45 ${i === 4 ? 'col-span-2 sm:col-span-1' : ''} ${on ? 'text-white border-transparent shadow-md' : 'bg-white hover:bg-[#EEF9FF] cursor-pointer'}`}
            style={on ? { background: C.primaryDark } : border}>
            <Icon className="h-5 w-5" />
            <span className="text-sm font-semibold leading-tight">{MODE_LABEL[m]}</span>
            <span className="text-[11px] leading-tight" style={on ? { color: 'rgba(255,255,255,0.85)' } : { color: C.muted }}>{offered ? hint(cfg[m]) : 'Not offered'}</span>
          </button>
        )
      })}
    </div>
  )
}

function Stepper({ value, onChange, min = 1, max = 50 }) {
  return (
    <div className="inline-flex items-center gap-3">
      <button type="button" aria-label="Fewer guests" disabled={value <= min} onClick={() => onChange(value - 1)} className="w-9 h-9 rounded-full border flex items-center justify-center disabled:opacity-30 cursor-pointer" style={border}><Minus className="w-4 h-4" /></button>
      <span className="w-6 text-center font-semibold">{value}</span>
      <button type="button" aria-label="More guests" disabled={value >= max} onClick={() => onChange(value + 1)} className="w-9 h-9 rounded-full border flex items-center justify-center disabled:opacity-30 cursor-pointer" style={border}><Plus className="w-4 h-4" /></button>
    </div>
  )
}

// One date for a Day or a Full day & night booking; the server says whether that date is free
function DayPicker({ villaId, mode, cfg, value, onChange }) {
  const [date, setDate] = useState(value.date || '')
  const [slots, setSlots] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!date) return undefined
    let alive = true
    setSlots(null)
    setFailed(false)
    api.get(`/user/villas/${villaId}/slots`, { params: { date } })
      .then((r) => alive && setSlots(r.data.data))
      .catch(() => alive && setFailed(true))
    return () => { alive = false }
  }, [villaId, date])

  const pickDate = (d) => { setDate(d); onChange(d ? { date: d } : {}) }
  const free = slots?.[mode]?.available
  const times = mode === 'day' ? `${cfg.startTime} – ${cfg.endTime}` : `${cfg.startTime} → ${cfg.endTime} next day`

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="slot-date" className="block text-sm font-semibold mb-1.5">Date</label>
        <input id="slot-date" type="date" min={todayStr()} max={addDays(todayStr(), 365)} value={date} onChange={(e) => pickDate(e.target.value)} className="rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#55B8F5]/40" style={border} />
      </div>
      <div className="rounded-2xl border p-3.5 flex items-center justify-between gap-3" style={border}>
        <span>
          <span className="block font-semibold">{MODE_LABEL[mode]}</span>
          <span className="block text-xs" style={{ color: C.muted }}>{times}{cfg.maxGuests ? ` · up to ${cfg.maxGuests} guests` : ''}</span>
        </span>
        <span className="text-right">
          <span className="block font-bold" style={{ color: C.primaryDark }}>{formatPaise(cfg.pricePaise)}</span>
          {slots && <span className={`block text-xs ${free ? 'text-emerald-700' : 'text-red-600'}`}>{free ? 'Available' : 'Not available'}</span>}
        </span>
      </div>
      {failed && <p className="text-sm text-red-600">Could not check this date. Please try again.</p>}
      {date && !slots && !failed && <p className="text-sm" style={{ color: C.muted }}>Checking availability…</p>}
    </div>
  )
}

const complete = (mode, sel) => (RANGE_MODES.includes(mode) ? Boolean(sel.checkIn && sel.checkOut) : Boolean(sel.date))

export default function BookingFlow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { villa, loading, notFound } = useVillaDetails(id)
  const cfg = villa?.booking

  const modes = useMemo(() => (cfg ? MODE_ORDER.filter((m) => cfg[m]?.enabled) : []), [cfg])
  const [mode, setMode] = useState('')
  const [sel, setSel] = useState({})
  const [guests, setGuests] = useState(2)
  const [coupon, setCoupon] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [quote, setQuote] = useState(null)
  const [quoteError, setQuoteError] = useState('')
  const [quoting, setQuoting] = useState(false)
  const [busy, setBusy] = useState(false)
  const idemKey = useRef(newKey())

  useEffect(() => { if (!mode && modes.length) setMode(modes[0]) }, [modes, mode])

  const changeMode = (m) => { setMode(m); setSel({}); setQuote(null); setQuoteError('') }
  const maxGuests = (mode === 'day' || mode === 'fullDayNight' ? cfg?.[mode]?.maxGuests : 0) || villa?.maxGuests || 50

  // Price the selection whenever it changes
  const selKey = JSON.stringify([mode, sel, guests, appliedCoupon])
  useEffect(() => {
    if (!mode || !complete(mode, sel)) { setQuote(null); setQuoteError(''); return undefined }
    let alive = true
    setQuoting(true)
    setQuoteError('')
    const t = setTimeout(() => {
      api.post('/user/bookings/quote', { villaId: id, mode, selection: sel, guests, couponCode: appliedCoupon || undefined })
        .then((r) => { if (alive) { setQuote(r.data.data); idemKey.current = newKey() } })
        .catch((err) => { if (alive) { setQuote(null); setQuoteError(errorMessage(err)) } })
        .finally(() => alive && setQuoting(false))
    }, 250)
    return () => { alive = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, id])

  const submit = async () => {
    setBusy(true)
    try {
      const res = await api.post('/user/bookings', { villaId: id, mode, selection: sel, guests, couponCode: appliedCoupon || undefined }, { headers: { 'Idempotency-Key': idemKey.current } })
      navigate(`/bookings/${res.data.data.id}`, { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
      setBusy(false)
    }
  }

  if (loading) return <><HomeNavbar /><div className="max-w-3xl mx-auto px-4 py-10"><div className="h-64 rounded-2xl bg-[#DDF3FF] animate-pulse" /></div></>
  if (notFound || !villa) return <><HomeNavbar /><div className="max-w-md mx-auto py-24 text-center"><p className="font-semibold">This villa is not available.</p><Link to="/villas" className="underline text-sm">Browse villas</Link></div></>
  if (!modes.length) return <><HomeNavbar /><div className="max-w-md mx-auto py-24 text-center"><p className="font-semibold">This villa is not taking bookings yet.</p><Link to={`/villas/${id}`} className="underline text-sm">Back to the villa</Link></div></>

  const instant = cfg.confirmationMode !== 'request'
  const cover = villa.photos?.[0]?.url

  return (
    <div className="min-h-screen antialiased pb-28 lg:pb-10" style={{ background: C.cream, color: C.ink }}>
      <HomeNavbar />
      <div className="max-w-5xl mx-auto px-4 pt-5">
        <Link to={`/villas/${id}`} className="inline-flex items-center gap-1 text-sm font-medium mb-3" style={{ color: C.primaryDark }}><ChevronLeft className="w-4 h-4" /> Back to the villa</Link>
        <h1 className="font-serif-display text-2xl lg:text-3xl font-bold">Book {villa.name}</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>{villa.location}</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] items-start">
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border p-5 space-y-4" style={border}>
              <h2 className="font-semibold">1. What would you like to book?</h2>
              <ModeCards cfg={cfg} mode={mode} onChange={changeMode} />
              {RANGE_MODES.includes(mode) && (
                <DateRangePicker key={mode} villaId={id} checkIn={sel.checkIn} checkOut={sel.checkOut} minNights={cfg[mode].minNights} maxNights={cfg[mode].maxNights} ratePaise={mode === 'night' ? 0 : cfg[mode].pricePerNightPaise} checkInTime={cfg.checkInTime} checkOutTime={cfg.checkOutTime} arrival={sel.checkInTime} departure={sel.checkOutTime} onTimes={({ arrival, departure }) => setSel((s) => ({ ...s, checkInTime: arrival, checkOutTime: departure }))} otherModes={modes.filter((m) => m === 'day' || m === 'fullDayNight')} onSwitchMode={changeMode} onChange={(r) => setSel({ ...r, checkInTime: '', checkOutTime: '' })} />
              )}
              {(mode === 'day' || mode === 'fullDayNight') && (
                <DayPicker key={mode} villaId={id} mode={mode} cfg={cfg[mode]} value={sel} onChange={setSel} />
              )}
              {RANGE_MODES.includes(mode) && <p className="text-xs" style={{ color: C.muted }}>You can arrive any time from {cfg.checkInTime} and must leave by {cfg.checkOutTime}. Pick your own times above once you choose the dates.</p>}
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-3" style={border}>
              <h2 className="font-semibold">2. Guests</h2>
              <Stepper value={Math.min(guests, maxGuests)} onChange={setGuests} max={maxGuests} />
              <p className="text-xs" style={{ color: C.muted }}>Up to {maxGuests} guests.</p>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-3" style={border}>
              <h2 className="font-semibold flex items-center gap-2"><Tag className="w-4 h-4" /> Coupon</h2>
              <div className="flex gap-2">
                <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Enter code" className="flex-1 rounded-xl border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#55B8F5]/40" style={border} />
                <button type="button" onClick={() => setAppliedCoupon(coupon.trim())} className="rounded-xl border px-4 text-sm font-semibold cursor-pointer" style={border}>Apply</button>
              </div>
              {appliedCoupon && <button type="button" className="text-xs underline" onClick={() => { setAppliedCoupon(''); setCoupon('') }}>Remove {appliedCoupon}</button>}
            </section>

            {villa.houseRules?.length > 0 && (
              <section className="bg-white rounded-2xl border p-5" style={border}>
                <h2 className="font-semibold mb-2">House rules</h2>
                <ul className="list-disc pl-5 text-sm space-y-1" style={{ color: C.muted }}>{villa.houseRules.map((r) => <li key={r}>{r}</li>)}</ul>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 bg-white rounded-2xl border p-5 space-y-4" style={border}>
            <div className="flex gap-3">
              {cover && <img src={assetUrl(cover)} alt="" className="w-20 h-16 rounded-xl object-cover" />}
              <div className="min-w-0">
                <p className="font-semibold leading-tight truncate">{villa.name}</p>
                <p className="text-xs" style={{ color: C.muted }}>{MODE_LABEL[mode]}{sel.checkIn && sel.checkOut ? ` · ${fullDate(sel.checkIn)}, ${quote ? localTimeOf(quote.startAt) : cfg.checkInTime} → ${fullDate(sel.checkOut)}, ${quote ? localTimeOf(quote.endAt) : cfg.checkOutTime}` : ''}{sel.date ? ` · ${fullDate(sel.date)}` : ''}</p>
              </div>
            </div>

            {quoting && <p className="text-sm" style={{ color: C.muted }}>Calculating price…</p>}
            {quoteError && <p role="alert" className="text-sm text-red-600">{quoteError}</p>}
            {!quote && !quoting && !quoteError && <p className="text-sm" style={{ color: C.muted }}>Choose your {RANGE_MODES.includes(mode) ? 'dates' : 'date'} to see the price.</p>}
            {quote && <PriceBreakdown pricing={quote.pricing} />}
            {quote && !quote.available && <p role="alert" className="text-sm text-red-600">Sorry, that time was just taken. Please choose another.</p>}

            <button type="button" onClick={submit} disabled={!quote || !quote.available || busy}
              className="w-full rounded-full py-3 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer" style={{ background: C.primaryDark }}>
              {busy ? 'Please wait…' : instant ? 'Continue to payment' : 'Send booking request'}
            </button>
            <p className="text-xs text-center" style={{ color: C.muted }}>
              {instant ? 'Your dates are held for a short time while you pay.' : 'The host will reply soon. You pay only after they accept.'}
            </p>
            {villa.policies?.cancellation && <p className="text-[11px] leading-relaxed" style={{ color: C.muted }}>{villa.policies.cancellation}</p>}
          </aside>
        </div>
      </div>
    </div>
  )
}
