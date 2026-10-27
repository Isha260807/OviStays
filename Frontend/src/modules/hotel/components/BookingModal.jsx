import { useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '@/services/api/axios.js'
import { ownerAPI } from '../services/ownerAPI.js'
import { useAsync } from './useAsync.js'
import { Btn, ErrorBox, Field, Input, Modal, Pill, Spinner, Textarea } from './ui.jsx'
import { MODE_LABEL, dateTime, formatPaise, slotText, timeLeft } from '@/shared/utils/booking.js'

function Row({ label, children }) {
  return <div className="flex justify-between gap-4 py-1.5 text-sm"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-900">{children}</dd></div>
}

// Everything about one booking, with the actions the owner may take right now.
export default function BookingModal({ id, onClose, onChanged }) {
  const { data: b, error, loading, reload, setData } = useAsync(() => ownerAPI.booking(id), [id])
  const [mode, setMode] = useState(null) // 'reject' | 'cancel' | 'checkin'
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn, ok) => {
    setBusy(true)
    try {
      await fn()
      toast.success(ok)
      setMode(null)
      setText('')
      await reload()
      onChanged?.()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const actions = b && (
    <div className="mt-5 space-y-3">
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
    </div>
  )

  return (
    <Modal open title={b ? `Booking ${b.code}` : 'Booking'} onClose={onClose}>
      {loading && !b && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {b && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2"><Pill>{b.status}</Pill><Pill>{b.paymentStatus}</Pill><span className="text-xs text-slate-500">{b.confirmationMode === 'request' ? 'Request to book' : 'Instant booking'}</span></div>
          {b.status === 'Requested' && b.ownerResponseDueAt && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Reply within {timeLeft(b.ownerResponseDueAt).replace(' left', '')}, or this request expires.</p>}
          {b.status === 'Awaiting Payment' && b.holdExpiresAt && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Waiting for the guest to pay ({timeLeft(b.holdExpiresAt)}).</p>}
          <dl className="divide-y divide-slate-100">
            <Row label="Villa">{b.villa?.name || b.villaName}</Row>
            <Row label="Type">{MODE_LABEL[b.mode]}</Row>
            <Row label="When">{slotText(b)}</Row>
            <Row label="Guests">{b.guests}</Row>
            <Row label="Guest">{b.guest.name}{b.guest.phone ? ` · ${b.guest.phone}` : ''}</Row>
            {b.payment?.method && <Row label="Paid with">{b.payment.method}</Row>}
            <Row label="Guest paid">{formatPaise(b.totalPaise)}</Row>
            <Row label="Your payout">{formatPaise(b.payoutPaise)}</Row>
            {b.checkedInAt && <Row label="Checked in">{dateTime(b.checkedInAt)}</Row>}
            {b.checkedOutAt && <Row label="Checked out">{dateTime(b.checkedOutAt)}</Row>}
            {b.rejectReason && <Row label="Decline reason">{b.rejectReason}</Row>}
            {b.cancellation && <Row label="Cancelled">{b.cancellation.by}{b.cancellation.reason ? ` · ${b.cancellation.reason}` : ''}{b.cancellation.refundPaise ? ` · refund ${formatPaise(b.cancellation.refundPaise)}` : ''}</Row>}
          </dl>
          {b.pricing?.lines && (
            <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold text-sky-700">Price breakdown</summary>
              <ul className="mt-2 space-y-1">{b.pricing.lines.map((l, i) => <li key={i} className="flex justify-between"><span>{l.label}</span><span>{l.amountPaise < 0 ? '−' : ''}{formatPaise(Math.abs(l.amountPaise))}</span></li>)}</ul>
            </details>
          )}
          {actions}
          <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold text-slate-600">History</summary>
            <ol className="mt-2 space-y-1 text-xs text-slate-600">{b.history.map((h, i) => <li key={i}>{dateTime(h.at)} · <b>{h.status}</b> ({h.by}){h.note ? ` · ${h.note}` : ''}</li>)}</ol>
          </details>
        </>
      )}
    </Modal>
  )
}
