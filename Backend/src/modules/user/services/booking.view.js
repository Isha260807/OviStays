import { computeRefund } from './refund.policy.js'

// How a booking looks to the guest and to the owner. Money is sent in paise and in rupees.

const nightsOf = (b) => (b.mode === 'night' || !b.mode ? Math.max(Math.round((new Date(b.checkOut) - new Date(b.checkIn)) / 86400000), 1) : 0)

const common = (b) => ({
  id: String(b._id),
  code: b.refId,
  villaId: String(b.hotel),
  villaName: b.hotelName,
  city: b.city || '',
  mode: b.mode || 'night',
  status: b.status,
  paymentStatus: b.paymentStatus || 'Unpaid',
  confirmationMode: b.confirmationMode || 'instant',
  checkIn: b.checkIn,
  checkOut: b.checkOut,
  timezone: b.timezone || 'Asia/Kolkata',
  nights: nightsOf(b),
  guests: b.guests,
  slot: b.slot ? { date: b.slot.date || '', packageName: b.slot.packageName || '', durationMinutes: b.slot.durationMinutes || 0 } : null,
  amount: b.amount,
  totalPaise: b.pricing?.totalPaise ?? Math.round((b.amount || 0) * 100),
  pricing: b.pricing ? { lines: b.pricing.lines || [], totalPaise: b.pricing.totalPaise, taxPaise: b.pricing.taxPaise, discountPaise: b.pricing.discountPaise, couponPaise: b.pricing.couponPaise, cleaningFeePaise: b.pricing.cleaningFeePaise } : null,
  ownerResponseDueAt: b.ownerResponseDueAt || null,
  payBy: b.payBy || null,
  holdExpiresAt: b.holdExpiresAt || null,
  createdAt: b.createdAt,
  history: (b.history || []).map((h) => ({ at: h.at, status: h.status, by: h.by, note: h.note })),
})

export function guestView(b, { villa, review, settings, now = new Date() } = {}) {
  const live = ['Confirmed', 'Checked In'].includes(b.status)
  const paid = b.paymentStatus === 'Paid'
  const preview = paid && b.status === 'Confirmed'
    ? computeRefund({ by: 'guest', paidPaise: b.pricing?.totalPaise || 0, startAt: b.checkIn, tiers: settings?.refundTiers || [], now })
    : null
  return {
    ...common(b),
    image: villa?.coverImage || '',
    address: live ? [villa?.address, villa?.city].filter(Boolean).join(', ') : '',
    mapUrl: live ? villa?.mapUrl || '' : '',
    // The code is shown only once the booking is confirmed
    checkInCode: live ? b.checkInCode || '' : '',
    canCancel: ['Requested', 'Awaiting Payment', 'Confirmed'].includes(b.status),
    canPay: b.status === 'Awaiting Payment' && (!b.holdExpiresAt || b.holdExpiresAt > now),
    refundIfCancelled: preview ? { percent: preview.percent, refundPaise: preview.refundPaise } : null,
    cancellation: b.cancellation?.by ? { by: b.cancellation.by, reason: b.cancellation.reason, at: b.cancellation.at, refundPercent: b.cancellation.refundPercent, refundPaise: b.cancellation.refundPaise } : null,
    rejectReason: b.rejectReason || '',
    review: review ? { rating: review.rating, status: review.status } : null,
    canReview: b.status === 'Checked Out' && !review,
  }
}

export function ownerView(b, { now = new Date() } = {}) {
  return {
    ...common(b),
    guest: { name: b.guestName, phone: b.guestPhone || '' },
    payoutPaise: b.pricing?.ownerPayoutPaise || 0,
    commissionPaise: b.pricing?.commissionPaise || 0,
    canRespond: b.status === 'Requested' && b.ownerResponseDueAt > now,
    canCancel: b.status === 'Confirmed',
    canCheckIn: b.status === 'Confirmed',
    canCheckOut: b.status === 'Checked In',
    checkedInAt: b.checkedInAt || null,
    checkedOutAt: b.checkedOutAt || null,
    rejectReason: b.rejectReason || '',
    cancellation: b.cancellation?.by ? { by: b.cancellation.by, reason: b.cancellation.reason, at: b.cancellation.at, refundPercent: b.cancellation.refundPercent, refundPaise: b.cancellation.refundPaise } : null,
  }
}
