import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarDays, ChevronLeft, MapPin, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import api, { errorMessage } from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'
import { HomeNavbar } from '../../components/home/HomeNav.jsx'
import { C } from '../../components/home/homeUi.jsx'
import { Countdown, PayButton, PriceBreakdown, STATUS_PILL, border, statusUi } from '../../components/booking/BookingParts.jsx'
import { MODE_LABEL, dateTime, formatPaise, slotText } from '@/shared/utils/booking.js'

const POLL_STATUSES = ['Requested', 'Awaiting Payment']

function Timeline({ history }) {
  if (!history?.length) return null
  return (
    <ol className="space-y-2.5 border-l pl-4" style={border}>
      {history.map((h, i) => (
        <li key={i} className="relative text-sm">
          <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full" style={{ background: C.primaryDark }} />
          <span className="font-semibold">{h.status}</span> <span style={{ color: C.muted }}>· {dateTime(h.at)}{h.note ? ` · ${h.note}` : ''}</span>
        </li>
      ))}
    </ol>
  )
}

function CancelDialog({ booking, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const refund = booking.refundIfCancelled
  const paid = booking.paymentStatus === 'Paid'

  const confirm = async () => {
    setBusy(true)
    try {
      const res = await api.post(`/user/bookings/${booking.id}/cancel`, { reason })
      toast.success(res.data.message)
      onDone(res.data.data)
    } catch (err) {
      toast.error(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 space-y-4">
        <h2 className="font-serif-display text-xl font-bold">Cancel this booking?</h2>
        {paid ? (
          <div className="rounded-xl p-3 text-sm" style={{ background: C.peach }}>
            {refund && refund.refundPaise > 0
              ? <>You will get <b>{formatPaise(refund.refundPaise)}</b> back ({refund.percent}% of what you paid).</>
              : <>This booking is no longer eligible for a refund under the cancellation policy.</>}
          </div>
        ) : <p className="text-sm" style={{ color: C.muted }}>You have not paid yet, so nothing will be charged.</p>}
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Reason (optional)" className="w-full rounded-xl border px-4 py-3 text-sm min-h-[80px]" style={border} />
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border py-2.5 text-sm font-semibold cursor-pointer" style={border}>Keep booking</button>
          <button type="button" onClick={confirm} disabled={busy} className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white bg-red-600 disabled:opacity-60 cursor-pointer">{busy ? 'Cancelling…' : 'Yes, cancel'}</button>
        </div>
      </div>
    </div>
  )
}

export default function BookingDetail() {
  const { id } = useParams()
  const [b, setB] = useState(null)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(() => api.get(`/user/bookings/${id}`).then((r) => setB(r.data.data)).catch((err) => setError(errorMessage(err))), [id])
  useEffect(() => { load() }, [load])

  // While waiting for the host or for payment, keep the page fresh
  useEffect(() => {
    if (!b || !POLL_STATUSES.includes(b.status)) return undefined
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [b, load])

  const paid = (data) => {
    if (data) { setB(data); if (data.status === 'Confirmed') toast.success('Payment received. Your booking is confirmed!') } else { toast.message('Payment is being processed…'); load() }
  }

  if (error) return <><HomeNavbar /><div className="max-w-md mx-auto py-24 text-center"><p className="font-semibold">{error}</p><Link to="/bookings" className="underline text-sm">My bookings</Link></div></>
  if (!b) return <><HomeNavbar /><div className="max-w-3xl mx-auto px-4 py-10"><div className="h-72 rounded-2xl bg-[#DDF3FF] animate-pulse" /></div></>

  const ui = statusUi(b.status)
  const Icon = ui.icon
  const cancelText = b.cancellation
    ? `Cancelled by ${b.cancellation.by === 'owner' ? 'the host' : b.cancellation.by === 'admin' ? 'support' : b.cancellation.by === 'system' ? 'the platform' : 'you'}${b.cancellation.reason ? `: ${b.cancellation.reason}` : ''}. ${b.cancellation.refundPaise ? `${formatPaise(b.cancellation.refundPaise)} (${b.cancellation.refundPercent}%) ${b.paymentStatus === 'Refunded' ? 'was refunded' : 'is being refunded'}.` : 'No refund applies.'}`
    : ''

  return (
    <div className="min-h-screen antialiased pb-16" style={{ background: C.cream, color: C.ink }}>
      <HomeNavbar />
      <div className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
        <Link to="/bookings" className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: C.primaryDark }}><ChevronLeft className="w-4 h-4" /> My bookings</Link>

        <div className={`rounded-2xl border p-4 flex gap-3 ${ui.tone}`}>
          <Icon className="w-6 h-6 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">{ui.title}</p>
            <p className="text-sm">{b.status === 'Cancelled' ? cancelText : b.status === 'Rejected' && b.rejectReason ? `${ui.text} Reason: ${b.rejectReason}` : ui.text}</p>
            {b.status === 'Requested' && b.ownerResponseDueAt && <div className="mt-1.5"><Countdown to={b.ownerResponseDueAt} label="Host reply due:" /></div>}
            {b.status === 'Awaiting Payment' && b.holdExpiresAt && <div className="mt-1.5"><Countdown to={b.holdExpiresAt} label="Dates held:" /></div>}
          </div>
        </div>

        {['Confirmed', 'Checked In'].includes(b.status) && b.checkInCode && (
          <div className="rounded-2xl border bg-white p-5 text-center" style={border}>
            <p className="text-sm flex items-center justify-center gap-1.5" style={{ color: C.muted }}><ShieldCheck className="w-4 h-4" /> Your check-in code</p>
            <p className="font-serif-display text-4xl font-bold tracking-[0.3em] mt-1" style={{ color: C.primaryDark }}>{b.checkInCode}</p>
            <p className="text-xs mt-1" style={{ color: C.muted }}>Tell this code to the host when you arrive. Don't share it before.</p>
          </div>
        )}

        <section className="bg-white rounded-2xl border p-5 space-y-4" style={border}>
          <div className="flex gap-4">
            <div className="w-24 h-20 rounded-xl overflow-hidden bg-[#DDF3FF] shrink-0">{b.image && <img src={assetUrl(b.image)} alt="" className="w-full h-full object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/villas/${b.villaId}`} className="font-serif-display text-lg font-semibold leading-tight">{b.villaName}</Link>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_PILL[b.status] || ''}`}>{b.status}</span>
              </div>
              {b.city && <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: C.muted }}><MapPin className="w-3.5 h-3.5" />{b.address || b.city}</p>}
              <p className="text-xs mt-1" style={{ color: C.muted }}>Booking {b.code} · {MODE_LABEL[b.mode]}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <p className="flex items-center gap-2"><CalendarDays className="w-4 h-4" style={{ color: C.muted }} /> {slotText(b)}</p>
            <p className="flex items-center gap-2"><Users className="w-4 h-4" style={{ color: C.muted }} /> {b.guests} {b.guests === 1 ? 'guest' : 'guests'}</p>
          </div>
          {b.mapUrl && <a href={b.mapUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold underline" style={{ color: C.primaryDark }}>Open in maps</a>}
        </section>

        {b.pricing && (
          <section className="bg-white rounded-2xl border p-5" style={border}>
            <h2 className="font-semibold mb-3">Payment</h2>
            <PriceBreakdown pricing={b.pricing} />
            <p className="text-xs mt-3" style={{ color: C.muted }}>Payment status: {b.paymentStatus}</p>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          {b.canPay && <PayButton booking={b} onPaid={paid} onError={(m) => toast.error(m)} />}
          {b.canCancel && <button type="button" onClick={() => setCancelling(true)} className="rounded-full border px-6 py-3 text-sm font-semibold text-red-600 cursor-pointer" style={border}>Cancel booking</button>}
          {b.canReview && <Link to="/bookings" className="rounded-full px-6 py-3 text-sm font-semibold text-white" style={{ background: C.primary }}>Rate your stay</Link>}
        </div>

        <section className="bg-white rounded-2xl border p-5" style={border}>
          <h2 className="font-semibold mb-3">Progress</h2>
          <Timeline history={b.history} />
        </section>
      </div>
      {cancelling && <CancelDialog booking={b} onClose={() => setCancelling(false)} onDone={(data) => { setB(data); setCancelling(false) }} />}
    </div>
  )
}
