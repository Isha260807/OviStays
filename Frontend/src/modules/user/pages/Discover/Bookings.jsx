import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, CalendarDays, MapPin, Star, Users, X } from 'lucide-react'
import api from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'
import { C } from '../../components/home/homeUi.jsx'
import { EmptyState, ErrorNote, PageShell, Skeletons } from '../../components/common/PageParts.jsx'
import { Notice, errorText, inputCls, primaryBtn } from '../../components/account/AccountUi.jsx'
import { formatPrice } from '../../data/homeData.js'
import { shortDate } from '../../utils/format.js'

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
]
const border = { borderColor: '#E2EDF5' }
const STATUS_STYLE = {
  Pending: 'bg-amber-50 text-amber-700',
  Confirmed: 'bg-emerald-50 text-emerald-700',
  'Checked In': 'bg-sky-50 text-sky-700',
  'Checked Out': 'bg-gray-100 text-gray-600',
  Cancelled: 'bg-red-50 text-red-600',
  Refunded: 'bg-purple-50 text-purple-700',
}
const EMPTY = {
  upcoming: { title: 'No upcoming trips', text: 'When you book a villa it will show up here.' },
  past: { title: 'No past stays yet', text: 'Your finished stays will be listed here.' },
  cancelled: { title: 'No cancelled bookings', text: 'Cancelled and refunded bookings appear here.' },
}

function ReviewModal({ booking, onClose, onDone }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!rating) return setMessage({ ok: false, text: 'Please choose a star rating' })
    setBusy(true)
    setMessage(null)
    try {
      await api.post(`/user/bookings/${booking.id}/review`, { rating, comment })
      onDone(booking.id, rating)
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif-display text-xl font-bold">Rate your stay</h2>
            <p className="text-sm" style={{ color: C.muted }}>{booking.villaName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer" style={border}><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="cursor-pointer">
              <Star className="w-9 h-9" fill={n <= rating ? '#F5A524' : 'none'} stroke={n <= rating ? '#F5A524' : '#CBD5E1'} />
            </button>
          ))}
        </div>
        <textarea className={`${inputCls} min-h-[110px] resize-y`} style={border} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder="Share what you liked (optional)" />
        <Notice message={message} />
        <button type="submit" disabled={busy} className={`${primaryBtn} w-full`} style={{ background: C.primary }}>{busy ? 'Sending...' : 'Submit review'}</button>
      </form>
    </div>
  )
}

function BookingCard({ b, onReview }) {
  return (
    <article className="flex gap-4 bg-white rounded-2xl border p-3.5 shadow-[0_6px_20px_rgba(22,138,211,0.06)]" style={border}>
      <Link to={`/villas/${b.villaId}`} className="shrink-0">
        <div className="w-[96px] h-[96px] sm:w-[130px] sm:h-[110px] rounded-xl overflow-hidden bg-[#DDF3FF]">
          {b.image && <img src={assetUrl(b.image)} alt={b.villaName} loading="lazy" className="w-full h-full object-cover" />}
        </div>
      </Link>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/villas/${b.villaId}`} className="font-serif-display text-lg font-semibold leading-tight">{b.villaName}</Link>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[b.status] || STATUS_STYLE['Checked Out']}`}>{b.status}</span>
        </div>
        {b.city && <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: C.muted }}><MapPin className="w-3.5 h-3.5" />{b.city}</p>}
        <p className="flex items-center gap-1.5 text-xs mt-2" style={{ color: C.muted }}>
          <CalendarDays className="w-3.5 h-3.5" /> {shortDate(b.checkIn)} → {shortDate(b.checkOut)} · {b.nights} {b.nights === 1 ? 'night' : 'nights'}
        </p>
        <p className="flex items-center gap-1.5 text-xs mt-1" style={{ color: C.muted }}><Users className="w-3.5 h-3.5" /> {b.guests} {b.guests === 1 ? 'guest' : 'guests'}</p>
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div>
            <p className="text-base font-bold" style={{ color: C.primaryDark }}>{formatPrice(b.amount)}</p>
            <p className="text-[10px]" style={{ color: C.muted }}>Booking {b.code}</p>
          </div>
          {b.canReview ? (
            <button type="button" onClick={() => onReview(b)} className="rounded-full px-4 py-1.5 text-xs font-semibold text-white cursor-pointer" style={{ background: C.primary }}>Rate stay</button>
          ) : b.review ? (
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: C.muted }}>
              <Star className="w-3.5 h-3.5" fill="#F5A524" stroke="#F5A524" /> {b.review.rating}{b.review.status === 'Pending' ? ' · awaiting approval' : ''}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default function Bookings() {
  const [tab, setTab] = useState('upcoming')
  const [items, setItems] = useState(null)
  const [error, setError] = useState(false)
  const [reviewing, setReviewing] = useState(null)

  useEffect(() => {
    let alive = true
    setItems(null)
    setError(false)
    api.get('/user/bookings', { params: { tab } })
      .then((res) => alive && setItems(res.data.data))
      .catch(() => alive && setError(true))
    return () => { alive = false }
  }, [tab])

  const reviewed = (id, rating) => {
    setItems((list) => list.map((b) => (b.id === id ? { ...b, canReview: false, review: { rating, status: 'Pending' } } : b)))
    setReviewing(null)
  }

  return (
    <PageShell narrow title="My Bookings">
      <div className="flex gap-2 mb-5" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`rounded-full border px-5 py-2 text-sm font-semibold cursor-pointer ${tab === t.key ? 'text-white border-transparent' : 'bg-white'}`} style={tab === t.key ? { background: C.primaryDark } : border}>
            {t.label}
          </button>
        ))}
      </div>

      {error ? <ErrorNote /> : items === null ? (
        <Skeletons count={3} className="h-[130px]" grid="grid gap-4" />
      ) : items.length === 0 ? (
        <EmptyState icon={Briefcase} {...EMPTY[tab]} actionLabel={tab === 'upcoming' ? 'Explore villas' : undefined} actionTo={tab === 'upcoming' ? '/villas' : undefined} />
      ) : (
        <div className="grid gap-4">{items.map((b) => <BookingCard key={b.id} b={b} onReview={setReviewing} />)}</div>
      )}

      {reviewing && <ReviewModal booking={reviewing} onClose={() => setReviewing(null)} onDone={reviewed} />}
    </PageShell>
  )
}
