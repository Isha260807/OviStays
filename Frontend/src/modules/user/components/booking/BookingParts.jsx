import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import api from '@/services/api/axios.js'
import { C } from '../home/homeUi.jsx'
import { formatPaise, timeLeft } from '@/shared/utils/booking.js'

export const border = { borderColor: '#E2EDF5' }

export function PriceBreakdown({ pricing }) {
  if (!pricing) return null
  return (
    <div className="text-sm">
      <ul className="space-y-1.5">
        {pricing.lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span style={{ color: l.amountPaise < 0 ? '#15803D' : undefined }}>{l.label}</span>
            <span className="shrink-0" style={{ color: l.amountPaise < 0 ? '#15803D' : undefined }}>{l.amountPaise < 0 ? '−' : ''}{formatPaise(Math.abs(l.amountPaise))}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 pt-3 border-t flex justify-between items-baseline font-bold" style={border}>
        <span>Total</span>
        <span className="text-lg" style={{ color: C.primaryDark }}>{formatPaise(pricing.totalPaise)}</span>
      </div>
    </div>
  )
}

// Ticks once a second so deadlines count down on screen
export function useNow(active = true) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])
  return now
}

export function Countdown({ to, label }) {
  const now = useNow()
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
      <Clock className="w-4 h-4" /> {label} {timeLeft(to, now)}
    </span>
  )
}

const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true)
  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = RAZORPAY_SRC
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

/**
 * Starts payment for a booking and reports the result.
 * With Razorpay keys on the server this opens Razorpay checkout; in development without keys it offers a
 * clearly labelled test payment instead. The server verifies the payment itself either way.
 */
export function PayButton({ booking, onPaid, onError, className = '' }) {
  const [busy, setBusy] = useState(false)

  const finish = (data) => {
    onPaid?.(data)
    setBusy(false)
  }
  const fail = (err) => {
    onError?.(err?.response?.data?.message || err?.message || 'Payment failed')
    setBusy(false)
  }

  const pay = async () => {
    setBusy(true)
    try {
      const { data } = await api.post(`/user/bookings/${booking.id}/pay`)
      const order = data.data
      if (order.mode === 'mock') {
        const res = await api.post(`/user/bookings/${booking.id}/payment/mock`, null, { validateStatus: (s) => s < 500 })
        if (res.data.success) return finish(res.data.data)
        throw new Error(res.data.message)
      }
      if (!(await loadRazorpay())) throw new Error('Could not load the payment window. Check your connection.')
      const rz = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: order.currency,
        name: order.villaName,
        description: `Booking ${order.code}`,
        theme: { color: C.primaryDark },
        handler: async (r) => {
          try {
            const res = await api.post(`/user/bookings/${booking.id}/payment/verify`, { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }, { validateStatus: (s) => s < 500 })
            if (res.status === 202) return finish(null)
            if (res.data.success) return finish(res.data.data)
            fail(new Error(res.data.message))
          } catch (err) {
            fail(err)
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      })
      rz.on('payment.failed', (r) => fail(new Error(r.error?.description || 'Payment failed')))
      rz.open()
    } catch (err) {
      fail(err)
    }
  }

  return (
    <button type="button" onClick={pay} disabled={busy} className={`rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-2 ${className}`} style={{ background: C.primaryDark }}>
      {busy && <Loader2 className="w-4 h-4 animate-spin" />} Pay {formatPaise(booking.totalPaise)}
    </button>
  )
}

const STATUS_UI = {
  Requested: { icon: Clock, tone: 'bg-amber-50 text-amber-800 border-amber-200', title: 'Waiting for the host', text: 'The host has been asked. You will be charged only if they accept.' },
  'Awaiting Payment': { icon: Clock, tone: 'bg-amber-50 text-amber-800 border-amber-200', title: 'Complete your payment', text: 'Your dates are held for you. Pay to confirm the booking.' },
  Confirmed: { icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-800 border-emerald-200', title: 'Booking confirmed', text: 'Show your check-in code to the host on arrival.' },
  'Checked In': { icon: CheckCircle2, tone: 'bg-sky-50 text-sky-800 border-sky-200', title: 'You are checked in', text: 'Enjoy your stay!' },
  'Checked Out': { icon: CheckCircle2, tone: 'bg-gray-50 text-gray-700 border-gray-200', title: 'Stay completed', text: 'Thanks for staying with us.' },
  Cancelled: { icon: XCircle, tone: 'bg-red-50 text-red-700 border-red-200', title: 'Booking cancelled', text: '' },
  Rejected: { icon: XCircle, tone: 'bg-red-50 text-red-700 border-red-200', title: 'Request declined', text: 'The host could not accept this request. You were not charged.' },
  Expired: { icon: XCircle, tone: 'bg-gray-50 text-gray-700 border-gray-200', title: 'Booking expired', text: 'The time to respond or pay ran out. Dates were released.' },
  'No Show': { icon: XCircle, tone: 'bg-gray-50 text-gray-700 border-gray-200', title: 'Marked as no-show', text: 'The stay was not checked in.' },
  'Payment Failed': { icon: XCircle, tone: 'bg-red-50 text-red-700 border-red-200', title: 'Payment failed', text: 'You can try again while your hold lasts.' },
}
export const statusUi = (status) => STATUS_UI[status] || STATUS_UI.Expired

export const STATUS_PILL = {
  Requested: 'bg-amber-50 text-amber-700',
  'Awaiting Payment': 'bg-amber-50 text-amber-700',
  Pending: 'bg-amber-50 text-amber-700',
  Confirmed: 'bg-emerald-50 text-emerald-700',
  'Checked In': 'bg-sky-50 text-sky-700',
  'Checked Out': 'bg-gray-100 text-gray-600',
  Cancelled: 'bg-red-50 text-red-600',
  Rejected: 'bg-red-50 text-red-600',
  Expired: 'bg-gray-100 text-gray-600',
  'Payment Failed': 'bg-red-50 text-red-600',
  'No Show': 'bg-gray-100 text-gray-600',
  Refunded: 'bg-purple-50 text-purple-700',
}
