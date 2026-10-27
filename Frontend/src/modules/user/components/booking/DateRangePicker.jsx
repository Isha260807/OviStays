import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/services/api/axios.js'
import { C } from '../home/homeUi.jsx'
import { addDays, addMonths, dayLabel, diffDays, localTimeOf, monthCells, monthLabel, monthStart, todayStr } from '@/shared/utils/booking.js'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const fmt12 = (t) => { const h = Number(t.slice(0, 2)); return `${h % 12 || 12}:${t.slice(3)} ${h < 12 ? 'AM' : 'PM'}` }
// Every half hour from..to, plus the exact limits themselves
const timeOptions = (from, to) => {
  const out = new Set([from, to])
  for (let m = Math.ceil(toMin(from) / 30) * 30; m <= toMin(to); m += 30) out.add(fromMin(m))
  return [...out].filter((t) => toMin(t) >= toMin(from) && toMin(t) <= toMin(to)).sort()
}
const short = (paise) => {
  const r = Math.round(paise / 100)
  return r >= 1000 ? `${Math.round(r / 100) / 10}k`.replace('.0k', 'k') : String(r)
}

// Pick check-in and check-out on a month calendar. Nights that are taken, blocked or too soon are greyed out,
// and a range can only be completed across free nights. The server checks everything again when booking.
export default function DateRangePicker({ villaId, checkIn, checkOut, onChange, minNights = 1, maxNights = 365, checkInTime = '12:00', checkOutTime = '11:00', arrival = '', departure = '', onTimes, otherModes = [], onSwitchMode }) {
  const [month, setMonth] = useState(() => monthStart(checkIn || todayStr()))
  const [nights, setNights] = useState({}) // date -> { available, pricePaise }
  const [loading, setLoading] = useState(false)
  const today = todayStr()

  useEffect(() => {
    let alive = true
    const from = month
    const to = addMonths(month, 2)
    setLoading(true)
    api.get(`/user/villas/${villaId}/availability`, { params: { from, to } })
      .then((res) => {
        if (!alive) return
        setNights((prev) => ({ ...prev, ...Object.fromEntries(res.data.data.nights.map((n) => [n.date, n])) }))
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [villaId, month])

  const free = (d) => nights[d]?.available === true
  // Every night from `from` up to (not including) `to` is free
  const rangeFree = (from, to) => {
    for (let d = from; d < to; d = addDays(d, 1)) if (!free(d)) return false
    return true
  }

  const canPick = (d) => {
    if (d < today) return false
    if (checkIn && !checkOut && d > checkIn) return rangeFree(checkIn, d) && diffDays(checkIn, d) <= maxNights
    return free(d)
  }

  const pick = (d) => {
    if (!canPick(d)) return
    if (!checkIn || checkOut) return onChange({ checkIn: d, checkOut: '' })
    if (d === checkIn) return onChange({ checkIn: '', checkOut: '' })
    if (d < checkIn) return onChange({ checkIn: d, checkOut: '' })
    onChange({ checkIn, checkOut: d })
  }

  // Tonight: the server says whether it can still be booked, and from what time the guest could arrive
  const tonight = nights[today]
  const sameDayClosed = tonight && !tonight.available
  const sameDayOpen = tonight?.available && tonight.lateArrival
  const cells = useMemo(() => monthCells(month), [month])
  const canGoBack = month > monthStart(today)

  return (
    <div className="rounded-2xl border bg-white p-3.5" style={{ borderColor: '#E2EDF5' }}>
      <div className="flex items-center justify-between mb-2">
        <button type="button" disabled={!canGoBack} onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month" className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-30 cursor-pointer" style={{ borderColor: '#E2EDF5' }}><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-sm font-semibold">{monthLabel(month)}{loading && <span className="ml-2 text-xs font-normal" style={{ color: C.muted }}>updating…</span>}</p>
        <button type="button" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month" className="w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer" style={{ borderColor: '#E2EDF5' }}><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold mb-1" style={{ color: C.muted }}>{DOW.map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />
          const start = d === checkIn
          const end = d === checkOut
          const inside = checkIn && checkOut && d > checkIn && d < checkOut
          const ok = canPick(d)
          return (
            <button key={d} type="button" onClick={() => pick(d)} disabled={!ok} aria-pressed={start || end} aria-label={d}
              className={`h-12 flex flex-col items-center justify-center text-sm transition-colors ${start || end ? 'rounded-xl text-white font-semibold' : inside ? 'font-medium' : ok ? 'rounded-xl hover:bg-[#EEF9FF] cursor-pointer' : 'text-gray-300 line-through'}`}
              style={start || end ? { background: C.primaryDark } : inside ? { background: C.peach } : undefined}>
              <span>{Number(d.slice(8))}</span>
              {nights[d]?.available && !(start || end) && <span className="text-[9px] leading-none" style={{ color: C.muted }}>{short(nights[d].pricePaise)}</span>}
            </button>
          )
        })}
      </div>
      {checkIn && checkOut && onTimes && (() => {
        const earliest = nights[checkIn]?.lateArrival ? localTimeOf(nights[checkIn].arriveFrom) : checkInTime
        const arrivals = timeOptions(earliest, '23:45')
        const departures = timeOptions('00:00', checkOutTime)
        return (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <label className="rounded-xl p-2.5 block" style={{ background: C.peach }}>
              <span className="block" style={{ color: C.muted }}>Your check-in time</span>
              <select value={arrival || earliest} onChange={(e) => onTimes({ arrival: e.target.value, departure: departure || checkOutTime })} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-sm font-semibold" style={{ borderColor: '#E2EDF5' }}>
                {arrivals.map((t) => <option key={t} value={t}>{fmt12(t)}</option>)}
              </select>
              <span className="mt-1 block" style={{ color: C.muted }}>{dayLabel(checkIn)} · earliest {fmt12(earliest)}</span>
            </label>
            <label className="rounded-xl p-2.5 block" style={{ background: C.peach }}>
              <span className="block" style={{ color: C.muted }}>Your check-out time</span>
              <select value={departure || checkOutTime} onChange={(e) => onTimes({ arrival: arrival || earliest, departure: e.target.value })} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-sm font-semibold" style={{ borderColor: '#E2EDF5' }}>
                {departures.map((t) => <option key={t} value={t}>{fmt12(t)}</option>)}
              </select>
              <span className="mt-1 block" style={{ color: C.muted }}>{dayLabel(checkOut)} · latest {fmt12(checkOutTime)}</span>
            </label>
          </div>
        )
      })()}
      {checkIn && !(checkOut && onTimes) && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl p-2.5" style={{ background: C.peach }}><p style={{ color: C.muted }}>Check-in</p><p className="font-semibold">{dayLabel(checkIn)}</p><p>from {nights[checkIn]?.lateArrival ? localTimeOf(nights[checkIn].arriveFrom) : checkInTime}</p></div>
          <div className="rounded-xl p-2.5" style={{ background: checkOut ? C.peach : '#F3F4F6' }}><p style={{ color: C.muted }}>Check-out</p><p className="font-semibold">{checkOut ? dayLabel(checkOut) : 'Pick a date'}</p><p>{checkOut ? `by ${checkOutTime}` : ''}</p></div>
        </div>
      )}
      {sameDayOpen && month === monthStart(today) && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
          <p className="font-semibold">You can still book tonight</p>
          <p>Check-in for today is possible from <b>{localTimeOf(tonight.arriveFrom)}</b> (instead of {checkInTime}). Check-out stays at {checkOutTime} the next day, so you get the rest of the night.</p>
        </div>
      )}
      {sameDayClosed && month === monthStart(today) && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          <p className="font-semibold">Tonight is not available</p>
          <p>It is too late to check in today, or tonight is already booked. The earliest night is tomorrow.</p>
          {otherModes.length > 0 && <p className="mt-1">Want something today? <button type="button" className="font-semibold underline cursor-pointer" onClick={() => onSwitchMode(otherModes[0])}>Try {otherModes.map((m) => (m === 'dayUse' ? 'Day use' : 'an hourly slot')).join(' or ')}</button>.</p>}
        </div>
      )}
      <p className="mt-2 text-[11px]" style={{ color: C.muted }}>
        {!checkIn ? 'Choose your check-in date' : !checkOut ? 'Now choose your check-out date' : `${diffDays(checkIn, checkOut)} night${diffDays(checkIn, checkOut) > 1 ? 's' : ''} selected`}
        {minNights > 1 && ` · minimum ${minNights} nights`}
      </p>
    </div>
  )
}
