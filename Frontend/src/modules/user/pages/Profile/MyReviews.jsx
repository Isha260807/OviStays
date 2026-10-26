import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Trash2 } from 'lucide-react'
import api from '@/services/api/axios.js'
import { C } from '../../components/home/homeUi.jsx'
import { AccountShell, Notice, card, cardBorder, errorText } from '../../components/account/AccountUi.jsx'
import { shortDate } from '../../utils/format.js'

const STATUS = {
  Published: 'bg-emerald-50 text-emerald-700',
  Pending: 'bg-amber-50 text-amber-700',
  Hidden: 'bg-gray-100 text-gray-600',
}

// Reviews the guest wrote after their stays
export default function MyReviews() {
  const [items, setItems] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    api.get('/user/reviews').then((res) => setItems(res.data.data)).catch(() => setItems([]))
  }, [])

  const remove = async (id) => {
    if (!window.confirm('Delete this review?')) return
    try {
      await api.delete(`/user/reviews/${id}`)
      setItems((list) => list.filter((r) => r.id !== id))
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
    }
  }

  return (
    <AccountShell title="My Reviews">
      <Notice message={message} />
      {items === null ? (
        <div className="space-y-3 animate-pulse">{[0, 1].map((i) => <div key={i} className="h-24 rounded-2xl bg-[#DDF3FF]" />)}</div>
      ) : items.length === 0 ? (
        <div className="mt-10 text-center">
          <span className="inline-flex w-16 h-16 rounded-full items-center justify-center" style={{ background: C.peach, color: C.primaryDark }}><Star className="w-7 h-7" /></span>
          <h2 className="font-serif-display text-xl font-bold mt-4">No reviews yet</h2>
          <p className="text-sm mt-1" style={{ color: C.muted }}>After a stay you can rate it from My Bookings.</p>
          <Link to="/bookings" className="inline-block mt-5 rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ background: C.primary }}>Go to My Bookings</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className={`${card} p-4`} style={cardBorder}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/villas/${r.villaId}`} className="font-serif-display text-base font-semibold">{r.villaName}</Link>
                  <p className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} className="w-4 h-4" fill={n <= r.rating ? '#F5A524' : 'none'} stroke={n <= r.rating ? '#F5A524' : '#CBD5E1'} />)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS[r.status] || STATUS.Hidden}`}>{r.status === 'Pending' ? 'Awaiting approval' : r.status}</span>
                  <button type="button" onClick={() => remove(r.id)} aria-label="Delete review" className="w-8 h-8 rounded-full border flex items-center justify-center text-red-600 cursor-pointer" style={cardBorder}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {r.comment && <p className="text-sm mt-2.5 leading-relaxed">{r.comment}</p>}
              <p className="text-[11px] mt-2" style={{ color: C.muted }}>{shortDate(r.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  )
}
