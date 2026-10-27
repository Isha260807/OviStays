import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, ChevronLeft, MapPin, Phone, User, Users } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'
import { ownerAPI } from '../services/ownerAPI.js'
import { useAsync } from '../components/useAsync.js'
import { Btn, Card, ErrorBox, Field, Input, Pill, Spinner, Textarea } from '../components/ui.jsx'
import { MODE_LABEL, dateTime, formatPaise, slotText, timeLeft } from '@/shared/utils/booking.js'

function Row({ label, children }) {
  return <div className="flex justify-between gap-4 py-2 text-sm"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-900">{children}</dd></div>
}

// One booking on its own page: who, when, money, what the owner can do now, and what happened so far
export default function BookingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: b, error, loading, reload } = useAsync(() => ownerAPI.booking(id), [id])
  const [mode, setMode] = useState(null) // 'reject' | 'cancel' | 'checkin'
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/hotel/bookings'))

  const run = async (fn, ok) => {
    setBusy(true)
    try {
      await fn()
      toast.success(ok)
      setMode(null)
      setText('')
      await reload()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading && !b) return <Spinner />
  if (error) return <div className="space-y-3"><button type="button" onClick={back} className="text-sm font-semibold text-sky-700">← Back</button><ErrorBox message={error} onRetry={reload} /></div>

  const canAct = b.canRespond || b.canCheckIn || b.canCheckOut || b.canCancel

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button type="button" onClick={back} className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 cursor-pointer"><ChevronLeft className="h-4 w-4" /> Bookings</button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Booking {b.code}</h1>
          <p className="text-sm text-slate-500">{MODE_LABEL[b.mode]} · {b.confirmationMode === 'request' ? 'Request to book' : 'Instant booking'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><Pill>{b.status}</Pill><Pill>{b.paymentStatus}</Pill></div>
      </div>

      {b.status === 'Requested' && b.ownerResponseDueAt && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Reply within {timeLeft(b.ownerResponseDueAt).replace(' left', '')}, or this request expires and the dates open up again.</p>}
      {b.status === 'Awaiting Payment' && b.holdExpiresAt && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Waiting for the guest to pay ({timeLeft(b.holdExpiresAt)}). The dates stay held for them until then.</p>}

      <Card>
        <div className="flex gap-4">
          <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-100">{b.villa?.image && <img src={assetUrl(b.villa.image)} alt="" className="h-full w-full object-cover" />}</div>
          <div className="min-w-0">
            <Link to={b.villa ? `/hotel/villas/${b.villa.id}` : '/hotel/villas'} className="font-semibold text-slate-900 hover:text-sky-700">{b.villa?.name || b.villaName}</Link>
            {b.villa?.address && <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{b.villa.address}</p>}
          </div>
        </div>
        <dl className="mt-4 divide-y divide-slate-100">
          <Row label={<span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> When</span>}>{slotText(b)}</Row>
          <Row label={<span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Guests</span>}>{b.guests}</Row>
          {b.checkedInAt && <Row label="Checked in">{dateTime(b.checkedInAt)}</Row>}
          {b.checkedOutAt && <Row label="Checked out">{dateTime(b.checkedOutAt)}</Row>}
        </dl>
      </Card>

      <Card title="Guest">
        <dl className="divide-y divide-slate-100">
          <Row label={<span className="flex items-center gap-1.5"><User className="h-4 w-4" /> Name</span>}>{b.guest.name}</Row>
          {b.guest.phone && <Row label={<span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> Phone</span>}><a href={`tel:${b.guest.phone}`} className="text-sky-700">{b.guest.phone}</a></Row>}
        </dl>
      </Card>

      <Card title="Payment">
        {b.pricing?.lines && (
          <ul className="space-y-1.5 text-sm">
            {b.pricing.lines.map((l, i) => <li key={i} className="flex justify-between"><span className={l.amountPaise < 0 ? 'text-emerald-700' : 'text-slate-600'}>{l.label}</span><span>{l.amountPaise < 0 ? '−' : ''}{formatPaise(Math.abs(l.amountPaise))}</span></li>)}
          </ul>
        )}
        <dl className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
          <Row label="Guest paid">{formatPaise(b.totalPaise)}</Row>
          <Row label="Platform fees">−{formatPaise(Math.max(0, b.totalPaise - b.payoutPaise))}</Row>
          <Row label="Your payout"><span className="text-base font-bold text-slate-900">{formatPaise(b.payoutPaise)}</span></Row>
          {b.payment?.method && <Row label="Paid with">{b.payment.method}</Row>}
          {b.payment?.refundedPaise > 0 && <Row label="Refunded to guest">{formatPaise(b.payment.refundedPaise)}</Row>}
        </dl>
      </Card>

      {(b.rejectReason || b.cancellation) && (
        <Card title="Why it ended">
          <dl className="divide-y divide-slate-100">
            {b.rejectReason && <Row label="Decline reason">{b.rejectReason}</Row>}
            {b.cancellation && <Row label="Cancelled by">{b.cancellation.by}</Row>}
            {b.cancellation?.reason && <Row label="Reason">{b.cancellation.reason}</Row>}
            {b.cancellation?.refundPaise > 0 && <Row label="Refund">{formatPaise(b.cancellation.refundPaise)} ({b.cancellation.refundPercent}%)</Row>}
          </dl>
        </Card>
      )}

      {canAct && (
        <Card title="What would you like to do?">
          {mode === null && (
            <div className="flex flex-wrap gap-2">
              {b.canRespond && <Btn loading={busy} onClick={() => run(() => ownerAPI.accept(b.id), 'Accepted. The guest can pay now.')}>Accept request</Btn>}
              {b.canRespond && <Btn variant="outline" onClick={() => setMode('reject')}>Decline</Btn>}
              {b.canCheckIn && <Btn onClick={() => setMode('checkin')}>Check in guest</Btn>}
              {b.canCheckOut && <Btn loading={busy} onClick={() => run(() => ownerAPI.checkOut(b.id), 'Guest checked out')}>Check out guest</Btn>}
              {b.canCancel && <Btn variant="danger" onClick={() => setMode('cancel')}>Cancel booking</Btn>}
            </div>
          )}
          {mode === 'reject' && (
            <div className="space-y-2">
              <Field label="Reason (the guest will see this)"><Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={300} /></Field>
              <div className="flex gap-2"><Btn variant="outline" onClick={() => setMode(null)}>Back</Btn><Btn variant="danger" loading={busy} onClick={() => run(() => ownerAPI.reject(b.id, text), 'Request declined')}>Decline request</Btn></div>
            </div>
          )}
          {mode === 'cancel' && (
            <div className="space-y-2">
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">The guest will get a <b>full refund</b>. Cancelling confirmed bookings can affect your listing.</p>
              <Field label="Why are you cancelling? (required, the guest will see this)"><Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={300} /></Field>
              <div className="flex gap-2"><Btn variant="outline" onClick={() => setMode(null)}>Back</Btn><Btn variant="danger" loading={busy} disabled={!text.trim()} onClick={() => run(() => ownerAPI.cancel(b.id, text), 'Booking cancelled')}>Cancel booking</Btn></div>
            </div>
          )}
          {mode === 'checkin' && (
            <div className="space-y-2">
              <Field label="Ask the guest for their 6-digit check-in code" hint="They can see it in their booking on the OviStays app."><Input value={text} onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoFocus className="text-center text-xl tracking-[0.4em]" /></Field>
              <div className="flex gap-2"><Btn variant="outline" onClick={() => setMode(null)}>Back</Btn><Btn loading={busy} disabled={text.length < 6} onClick={() => run(() => ownerAPI.checkIn(b.id, text), 'Guest checked in')}>Verify &amp; check in</Btn></div>
            </div>
          )}
        </Card>
      )}

      <Card title="Progress">
        <ol className="space-y-3 border-l border-slate-200 pl-4">
          {b.history.map((h, i) => (
            <li key={i} className="relative text-sm">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-sky-600" />
              <span className="font-semibold text-slate-900">{h.status}</span> <span className="text-slate-500">· {dateTime(h.at)} · {h.by}{h.note ? ` · ${h.note}` : ''}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
