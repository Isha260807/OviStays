import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Minus, Plus, Tag } from 'lucide-react'
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

function ModeTabs({ modes, mode, onChange }) {
  return (
    <div role="tablist" className="flex gap-2 flex-wrap">
      {modes.map((m) => (
        <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => onChange(m)}
          className={`rounded-full border px-4 py-2 text-sm font-semibold cursor-pointer ${mode === m ? 'text-white border-transparent' : 'bg-white'}`}
          style={mode === m ? { background: C.primaryDark } : border}>
          {MODE_LABEL[m]}
        </button>
      ))}
    </div>
  )
}

const endTime = (start, hours) => {
  const [h, m] = start.split(':').map(Number)
  const t = h * 60 + m + hours * 60
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
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

// Day-use packages and hourly start times for one date, as the server reports them (taken ones are disabled)
function SlotPicker({ villaId, mode, cfg, value, onChange }) {
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

  const pickDate = (d) => { setDate(d); onChange({ date: d }) }
  const max = addDays(todayStr(), 365)

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="slot-date" className="block text-sm font-semibold mb-1.5">Date</label>
        <input id="slot-date" type="date" min={todayStr()} max={max} value={date} onChange={(e) => pickDate(e.target.value)} className="rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#55B8F5]/40" style={border} />
      </div>
      {failed && <p className="text-sm text-red-600">Could not load the times. Please try again.</p>}
      {date && !slots && !failed && <p className="text-sm" style={{ color: C.muted }}>Checking availability…</p>}

      {slots && mode === 'dayUse' && (
        <div className="grid gap-2.5">
          {slots.dayUse.length === 0 && <p className="text-sm" style={{ color: C.muted }}>No day-use packages are offered.</p>}
          {slots.dayUse.map((p) => (
            <button key={p.packageId} type="button" disabled={!p.available} onClick={() => onChange({ date, packageId: p.packageId })}
              className={`text-left rounded-2xl border p-3.5 flex items-center justify-between gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${value.packageId === p.packageId ? 'ring-2 ring-[#168AD3]' : ''}`} style={border}>
              <span>
                <span className="block font-semibold">{p.name}</span>
                <span className="block text-xs" style={{ color: C.muted }}>{p.startTime} – {p.endTime}{p.maxGuests ? ` · up to ${p.maxGuests} guests` : ''}</span>
              </span>
              <span className="text-right">
                <span className="block font-bold" style={{ color: C.primaryDark }}>{formatPaise(p.pricePaise)}</span>
                {!p.available && <span className="block text-xs text-red-600">Not available</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {slots && mode === 'hourly' && slots.hourlyFlex && (() => {
        const f = slots.hourlyFlex
        const chosen = f.starts.find((x) => x.time === value.startTime)
        const hours = value.durationMinutes ? value.durationMinutes / 60 : 0
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-1.5">Start time <span className="font-normal" style={{ color: C.muted }}>· {formatPaise(f.pricePerHourPaise)} per hour, open {f.openTime} – {f.closeTime}</span></p>
              <div className="flex flex-wrap gap-2">
                {f.starts.map((s) => (
                  <button key={s.time} type="button" disabled={!s.available} onClick={() => onChange({ date, startTime: s.time, durationMinutes: Math.min(Math.max(hours || f.minHours, f.minHours), s.maxHours) * 60 })}
                    className={`rounded-lg border px-3 py-2 text-sm cursor-pointer disabled:opacity-40 disabled:line-through disabled:cursor-not-allowed ${value.startTime === s.time ? 'text-white border-transparent' : 'bg-white'}`}
                    style={value.startTime === s.time ? { background: C.primaryDark } : border}>{s.time}</button>
                ))}
              </div>
            </div>
            {chosen && (
              <div>
                <p className="text-sm font-semibold mb-1.5">How many hours?</p>
                <div className="flex items-center gap-4">
                  <Stepper value={hours} min={f.minHours} max={chosen.maxHours} onChange={(h) => onChange({ ...value, durationMinutes: h * 60 })} />
                  <p className="text-sm">{value.startTime} → <b>{endTime(value.startTime, hours)}</b></p>
                </div>
                <p className="mt-1.5 text-xs" style={{ color: C.muted }}>{formatPaise(f.pricePerHourPaise)} × {hours} hour{hours > 1 ? 's' : ''} = <b style={{ color: C.primaryDark }}>{formatPaise(f.pricePerHourPaise * hours)}</b>. You can stay up to {chosen.maxHours} hour{chosen.maxHours > 1 ? 's' : ''} from {value.startTime} (the next booking or closing time stops it).</p>
              </div>
            )}
          </div>
        )
      })()}

      {slots && mode === 'hourly' && !slots.hourlyFlex && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-1.5">Slot length</p>
            <div className="flex flex-wrap gap-2">
              {cfg.durations.map((d) => (
                <button key={d.minutes} type="button" onClick={() => onChange({ date, durationMinutes: d.minutes, startTime: '' })}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold cursor-pointer ${value.durationMinutes === d.minutes ? 'text-white border-transparent' : 'bg-white'}`}
                  style={value.durationMinutes === d.minutes ? { background: C.primaryDark } : border}>
                  {d.minutes / 60} hr · {formatPaise(d.pricePaise)}
                </button>
              ))}
            </div>
          </div>
          {value.durationMinutes && (
            <div>
              <p className="text-sm font-semibold mb-1.5">Start time</p>
              <div className="flex flex-wrap gap-2">
                {(slots.hourly.find((h) => h.durationMinutes === value.durationMinutes)?.starts || []).map((s) => (
                  <button key={s.time} type="button" disabled={!s.available} onClick={() => onChange({ ...value, date, startTime: s.time })}
                    className={`rounded-lg border px-3 py-2 text-sm cursor-pointer disabled:opacity-40 disabled:line-through disabled:cursor-not-allowed ${value.startTime === s.time ? 'text-white border-transparent' : 'bg-white'}`}
                    style={value.startTime === s.time ? { background: C.primaryDark } : border}>
                    {s.time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const complete = (mode, sel) => {
  if (mode === 'night') return Boolean(sel.checkIn && sel.checkOut)
  if (mode === 'dayUse') return Boolean(sel.date && sel.packageId)
  return Boolean(sel.date && sel.durationMinutes && sel.startTime)
}

export default function BookingFlow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { villa, loading, notFound } = useVillaDetails(id)
  const cfg = villa?.booking

  const modes = useMemo(() => (cfg ? ['night', 'dayUse', 'hourly'].filter((m) => cfg[m]?.enabled) : []), [cfg])
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
  const maxGuests = mode === 'dayUse' ? (cfg?.dayUse.packages.find((p) => p.id === sel.packageId)?.maxGuests || villa?.maxGuests || 50) : (villa?.maxGuests || 50)

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
              {modes.length > 1 && <ModeTabs modes={modes} mode={mode} onChange={changeMode} />}
              {mode === 'night' && (
                <DateRangePicker villaId={id} checkIn={sel.checkIn} checkOut={sel.checkOut} minNights={cfg.night.minNights} maxNights={cfg.night.maxNights} checkInTime={cfg.checkInTime} checkOutTime={cfg.checkOutTime} arrival={sel.checkInTime} departure={sel.checkOutTime} onTimes={({ arrival, departure }) => setSel((s) => ({ ...s, checkInTime: arrival, checkOutTime: departure }))} otherModes={modes.filter((m) => m !== 'night')} onSwitchMode={changeMode} onChange={(r) => setSel({ ...r, checkInTime: '', checkOutTime: '' })} />
              )}
              {(mode === 'dayUse' || mode === 'hourly') && (
                <SlotPicker key={mode} villaId={id} mode={mode} cfg={cfg[mode]} value={sel} onChange={setSel} />
              )}
              {mode === 'night' && <p className="text-xs" style={{ color: C.muted }}>You can arrive any time from {cfg.checkInTime} and must leave by {cfg.checkOutTime}. Pick your own times above once you choose the dates.</p>}
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
                <p className="text-xs" style={{ color: C.muted }}>{MODE_LABEL[mode]}{sel.checkIn && sel.checkOut ? ` · ${fullDate(sel.checkIn)}, ${quote ? localTimeOf(quote.startAt) : cfg.checkInTime} → ${fullDate(sel.checkOut)}, ${quote ? localTimeOf(quote.endAt) : cfg.checkOutTime}` : ''}{sel.date ? ` · ${fullDate(sel.date)}` : ''}{sel.startTime ? `, ${sel.startTime}` : ''}</p>
              </div>
            </div>

            {quoting && <p className="text-sm" style={{ color: C.muted }}>Calculating price…</p>}
            {quoteError && <p role="alert" className="text-sm text-red-600">{quoteError}</p>}
            {!quote && !quoting && !quoteError && <p className="text-sm" style={{ color: C.muted }}>Choose your {mode === 'night' ? 'dates' : 'date and time'} to see the price.</p>}
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
