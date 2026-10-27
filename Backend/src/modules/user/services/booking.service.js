import { isInActiveState } from '../../../utils/activeStates.js'
import crypto from 'crypto'
import Booking from '../../../models/Booking.model.js'
import Hotel from '../../../models/Hotel.model.js'
import Payment from '../../../models/Payment.model.js'
import PriceRule from '../../../models/PriceRule.model.js'
import Coupon from '../../../models/Coupon.model.js'
import Settings from '../../../models/Settings.model.js'
import AvailabilityBlock from '../../../models/AvailabilityBlock.model.js'
import { audit } from '../../../models/AuditLog.model.js'
import Owner from '../../hotel/models/Owner.model.js'
import { HttpError, badRequest, notFound } from '../../../utils/httpError.js'
import { formatInr } from '../../../utils/money.js'
import { notifyOwner, notifyUser } from '../../../core/notifications/notify.service.js'
import * as payments from '../../../core/payments/payment.service.js'
import { gateway } from '../../../core/payments/gateway.js'
import { computeQuote } from './pricing.service.js'
import { blockedUntilOf, findConflicts, placeBlock, releaseBlock, extendBlock, withVillaLock } from './availability.service.js'
import { computeRefund } from './refund.policy.js'

// The booking life cycle. Every status change goes through setStatus(), which only moves a booking
// out of the statuses the caller expects, so two things happening at once (a payment and a timeout,
// a cancel and a check-in) can never both win.
//
//   instant:  Awaiting Payment -> Confirmed | Expired | Payment Failed
//   request:  Requested -> Awaiting Payment (owner accepts) | Rejected | Expired
//   after:    Confirmed -> Checked In -> Checked Out;  Confirmed -> Cancelled | No Show

const MAX_OPEN_REQUESTS = 5
const MIN = 60 * 1000
const HOUR = 60 * MIN
const money = formatInr

const when = (b) => new Date(b.checkIn).toLocaleString('en-IN', { timeZone: b.timezone || 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export async function setStatus(filter, from, to, patch = {}, by = 'system', note = '') {
  return Booking.findOneAndUpdate(
    { ...filter, status: { $in: from } },
    { $set: { status: to, ...patch }, $push: { history: { at: new Date(), status: to, by, note } } },
    { returnDocument: 'after' }
  )
}

const asVillaForPricing = (v) => (typeof v.toObject === 'function' ? v.toObject() : v)

async function loadBookableVilla(villaId) {
  const villa = await Hotel.findById(villaId)
  const approved = villa && villa.status === 'Active' && (!villa.listingStatus || villa.listingStatus === 'Approved')
  if (!approved) throw notFound('Villa not found')
  if (!(await isInActiveState(villa))) throw new HttpError(409, 'Bookings are not open in this state right now')
  if (villa.ownerId) {
    const owner = await Owner.findById(villa.ownerId).select('status').lean()
    if (!owner || owner.status !== 'Active') throw new HttpError(409, 'This villa is not taking bookings right now')
  }
  return villa
}

async function loadCoupon(code) {
  if (!code) return null
  const coupon = await Coupon.findOne({ couponCode: String(code).trim().toUpperCase() })
  if (!coupon) throw badRequest('This coupon is not valid')
  return coupon
}

/** Price and availability for a selection, without holding anything. */
export async function quoteBooking({ villaId, mode, selection, guests, couponCode, now = new Date() }) {
  const [villa, settings] = await Promise.all([loadBookableVilla(villaId), Settings.get()])
  const [rules, coupon] = await Promise.all([PriceRule.find({ villa: villa._id }).sort({ startDate: 1 }).lean(), loadCoupon(couponCode)])
  const quote = computeQuote({ villa: asVillaForPricing(villa), mode, selection, guests, rules, settings, coupon, now })
  const conflicts = await findConflicts(villa._id, quote.startAt, blockedUntilOf(villa, quote.endAt), { now })
  return { villa, settings, quote, available: conflicts.length === 0 }
}

const codeOf = () => String(crypto.randomInt(100000, 1000000))

/** Creates a booking and holds the calendar for it. Repeating the same idempotency key returns the same booking. */
export async function createBooking({ user, villaId, mode, selection, guests, couponCode, idempotencyKey, now = new Date() }) {
  if (idempotencyKey) {
    const dup = await Booking.findOne({ user: user._id, idempotencyKey })
    if (dup) return { booking: dup, reused: true }
  }
  const settings = await Settings.get()
  if (settings.maintenanceMode) throw new HttpError(503, 'New bookings are paused for a short while. Please try again later.')
  if (user.status !== 'Active') throw new HttpError(403, 'This account cannot make bookings')

  const open = await Booking.countDocuments({ user: user._id, status: { $in: ['Requested', 'Awaiting Payment'] } })
  if (open >= MAX_OPEN_REQUESTS) throw new HttpError(429, 'You have several bookings waiting already. Finish or cancel one first.')

  const { villa, quote } = await quoteBooking({ villaId, mode, selection, guests, couponCode, now })
  const instant = villa.confirmationMode !== 'request'
  const expiresAt = new Date(now.getTime() + (instant ? settings.instantHoldMinutes * MIN : settings.ownerResponseHours * HOUR))
  const p = quote.pricing

  return withVillaLock(villa._id, async () => {
    // Look once more now that this request has the villa to itself
    const clash = await findConflicts(villa._id, quote.startAt, blockedUntilOf(villa, quote.endAt), { now })
    if (clash.length) throw new HttpError(409, 'Sorry, that time was just taken. Please choose another.')

    let booking
    try {
      booking = await Booking.create({
        user: user._id, guestName: user.name || 'Guest', guestPhone: user.phone || '',
        hotel: villa._id, hotelName: villa.name, ownerId: villa.ownerId, city: villa.city,
        guests: quote.guests, checkIn: quote.startAt, checkOut: quote.endAt, mode, slot: quote.slot, timezone: quote.tz,
        confirmationMode: instant ? 'instant' : 'request',
        amount: p.totalPaise / 100, commission: p.commissionPaise / 100, platformFee: p.platformFeePaise / 100, gst: p.commissionGstPaise / 100,
        pricing: p,
        status: instant ? 'Awaiting Payment' : 'Requested',
        requestedAt: now,
        ownerResponseDueAt: instant ? undefined : expiresAt,
        payBy: instant ? expiresAt : undefined,
        holdExpiresAt: expiresAt,
        idempotencyKey: idempotencyKey || undefined,
        history: [{ at: now, status: instant ? 'Awaiting Payment' : 'Requested', by: 'guest' }],
      })
    } catch (err) {
      if (err?.code === 11000 && idempotencyKey) return { booking: await Booking.findOne({ user: user._id, idempotencyKey }), reused: true }
      throw err
    }

    try {
      await placeBlock(villa, { type: 'hold', mode, booking: booking._id, owner: villa.ownerId, startAt: quote.startAt, endAt: quote.endAt, expiresAt }, { now })
    } catch (err) {
      await Booking.deleteOne({ _id: booking._id })
      throw err
    }

    if (!instant) {
      notifyOwner(villa.ownerId, { title: 'New booking request', message: `${booking.guestName} wants ${villa.name} on ${when(booking)} (${money(p.totalPaise)}). Reply within ${settings.ownerResponseHours} hours.`, link: '/hotel/bookings?tab=pending' })
    }
    return { booking, reused: false }
  })
}

/** Owner answers a request. Accepting opens the payment window; rejecting frees the dates. */
export async function respondToRequest({ bookingId, ownerId, accept, reason = '', now = new Date() }) {
  const settings = await Settings.get()
  const booking = await Booking.findOne({ _id: bookingId, ownerId })
  if (!booking) throw notFound('Booking not found')

  if (accept) {
    const payBy = new Date(now.getTime() + settings.payWindowMinutes * MIN)
    const updated = await Booking.findOneAndUpdate(
      { _id: bookingId, ownerId, status: 'Requested', ownerResponseDueAt: { $gt: now } },
      { $set: { status: 'Awaiting Payment', payBy, holdExpiresAt: payBy }, $unset: { ownerResponseDueAt: 1 }, $push: { history: { at: now, status: 'Awaiting Payment', by: 'owner', note: 'Accepted' } } },
      { returnDocument: 'after' }
    )
    if (!updated) throw new HttpError(409, booking.status === 'Requested' ? 'This request has expired' : 'This request was already answered')
    const extended = await extendBlock(bookingId, payBy)
    if (!extended.matchedCount) {
      // The hold was swept just as the owner answered; take the dates again if they are still free
      const villa = await Hotel.findById(updated.hotel)
      try {
        await withVillaLock(villa._id, () => placeBlock(villa, { type: 'hold', mode: updated.mode, booking: updated._id, owner: villa.ownerId, startAt: updated.checkIn, endAt: updated.checkOut, expiresAt: payBy }, { now }))
      } catch (err) {
        await setStatus({ _id: bookingId }, ['Awaiting Payment'], 'Expired', {}, 'system', 'Dates were taken before payment')
        throw err
      }
    }
    notifyUser(updated.user, { title: 'Request accepted - pay to confirm', message: `${updated.hotelName} is yours if you pay ${money(updated.pricing.totalPaise)} within ${Math.round(settings.payWindowMinutes / 60 * 10) / 10} hours.`, link: `/bookings/${updated._id}` })
    return updated
  }

  const rejected = await setStatus({ _id: bookingId, ownerId }, ['Requested'], 'Rejected', { rejectReason: reason }, 'owner', reason)
  if (!rejected) throw new HttpError(409, 'This request was already answered')
  await releaseBlock(bookingId)
  notifyUser(rejected.user, { title: 'Request declined', message: `${rejected.hotelName} could not accept your request.${reason ? ` ${reason}` : ''}`, link: `/bookings/${rejected._id}` })
  return rejected
}

/** Starts (or resumes) payment for a booking that is waiting for it. */
export async function startPayment({ bookingId, userId, now = new Date() }) {
  const booking = await Booking.findOne({ _id: bookingId, user: userId })
  if (!booking) throw notFound('Booking not found')
  if (booking.status !== 'Awaiting Payment') throw new HttpError(409, booking.status === 'Requested' ? 'The owner has not accepted this request yet' : 'This booking is not waiting for payment')
  if (booking.holdExpiresAt && booking.holdExpiresAt <= now) throw new HttpError(409, 'Your hold has expired. Please book again.')
  const { payment, gw } = await payments.createOrderForBooking(booking)
  return {
    mode: gw.mode, keyId: gw.keyId(), orderId: payment.orderId, amountPaise: payment.amountPaise, currency: 'INR',
    bookingId: String(booking._id), code: booking.refId, villaName: booking.hotelName, expiresAt: booking.holdExpiresAt,
  }
}

/** Puts a booking's dates on the calendar for good, unless someone else took them in the meantime. */
async function lockInCalendar(booking, villa) {
  return withVillaLock(villa._id, async () => {
    const until = blockedUntilOf(villa, booking.checkOut)
    const clash = await findConflicts(villa._id, booking.checkIn, until, { excludeBooking: booking._id })
    if (clash.length) return false
    const res = await AvailabilityBlock.updateMany({ booking: booking._id }, { type: 'booking', expiresAt: null, released: false, startAt: booking.checkIn, endAt: booking.checkOut, blockedUntil: until })
    if (!res.matchedCount) {
      await AvailabilityBlock.create({ villa: villa._id, owner: villa.ownerId, type: 'booking', mode: booking.mode, booking: booking._id, startAt: booking.checkIn, endAt: booking.checkOut, blockedUntil: until })
    }
    return true
  })
}

async function refundWholePayment(payment, reason) {
  const updated = await payments.requestRefund(payment, payment.amountPaise, `full:${payment._id}`, reason)
  if (updated) {
    await Booking.updateOne({ _id: payment.booking, paymentStatus: { $in: ['Paid', 'Unpaid', 'Failed'] } }, { paymentStatus: 'Refund Pending' })
    await payments.processRefund(payment._id, `full:${payment._id}`)
  }
}

/**
 * A verified, captured payment arrived (from the browser or the webhook). Safe to call twice.
 * Confirms the booking, or, if it can no longer be confirmed, sends the money straight back.
 */
export async function confirmAfterPayment(paymentDocId, gatewayPayment, { now = new Date() } = {}) {
  const payment = await payments.markPaid(paymentDocId, gatewayPayment)
  if (!payment) {
    const earlier = await Payment.findById(paymentDocId).select('booking')
    return { duplicate: true, booking: earlier ? await Booking.findById(earlier.booking) : null }
  }

  const booking = await Booking.findById(payment.booking)
  if (!booking) {
    await refundWholePayment(payment, 'Booking not found')
    return { refunded: true }
  }
  const villa = await Hotel.findById(booking.hotel)

  if (['Confirmed', 'Checked In', 'Checked Out'].includes(booking.status)) {
    await refundWholePayment(payment, 'Duplicate payment for a confirmed booking')
    return { refunded: true, booking }
  }

  if (['Awaiting Payment', 'Expired', 'Payment Failed'].includes(booking.status) && villa) {
    const free = await lockInCalendar(booking, villa)
    if (free) {
      const code = codeOf()
      const confirmed = await setStatus(
        { _id: booking._id }, ['Awaiting Payment', 'Expired', 'Payment Failed'], 'Confirmed',
        { paymentStatus: 'Paid', confirmedAt: now, checkInCode: code, holdExpiresAt: null, payBy: null }, 'system', 'Payment received'
      )
      if (confirmed) {
        notifyUser(confirmed.user, { title: 'Booking confirmed', message: `${confirmed.hotelName}, ${when(confirmed)}. Your check-in code is ${code}.`, link: `/bookings/${confirmed._id}` })
        notifyOwner(confirmed.ownerId, { title: 'Booking confirmed', message: `${confirmed.guestName} - ${confirmed.hotelName}, ${when(confirmed)} (${money(confirmed.pricing.totalPaise)} paid).`, link: '/hotel/bookings' })
        return { booking: confirmed }
      }
      // Cancelled or rejected at the same moment: give the dates back
      await releaseBlock(booking._id)
    }
    await setStatus({ _id: booking._id }, ['Awaiting Payment', 'Payment Failed'], 'Expired', {}, 'system', 'Dates were taken before payment arrived')
    await refundWholePayment(payment, 'Dates no longer available')
    notifyUser(booking.user, { title: 'Payment refunded', message: `${booking.hotelName} was no longer available when your payment arrived, so it is being refunded in full.`, link: `/bookings/${booking._id}` })
    return { refunded: true }
  }

  await refundWholePayment(payment, `Payment received for a ${booking.status} booking`)
  return { refunded: true, booking }
}

/**
 * Cancels a booking. `by` decides who may and how much comes back:
 * guest and owner act on their own bookings (checked by the caller), admin on any.
 */
export async function cancelBooking({ bookingId, by, byId, reason = '', adminPercent, now = new Date() }) {
  const allowed = by === 'guest' ? ['Requested', 'Awaiting Payment', 'Confirmed'] : by === 'owner' ? ['Confirmed'] : ['Requested', 'Awaiting Payment', 'Confirmed', 'Checked In']
  const settings = await Settings.get()

  const cancelled = await setStatus({ _id: bookingId }, allowed, 'Cancelled', { cancellation: { by, reason: String(reason).slice(0, 300), at: now } }, by, reason)
  if (!cancelled) throw new HttpError(409, 'This booking can no longer be cancelled')
  await releaseBlock(cancelled._id)

  let refund = { percent: 0, refundPaise: 0 }
  if (cancelled.paymentStatus === 'Paid') {
    const payment = await Payment.findOne({ booking: cancelled._id, status: 'Paid' })
    if (payment) {
      refund = computeRefund({ by, paidPaise: payment.amountPaise, startAt: cancelled.checkIn, tiers: settings.refundTiers, now, adminPercent })
      if (refund.refundPaise > 0) {
        const key = `cancel:${cancelled._id}`
        const updated = await payments.requestRefund(payment, refund.refundPaise, key, `Cancelled by ${by}`)
        if (updated) {
          await Booking.updateOne({ _id: cancelled._id }, { paymentStatus: 'Refund Pending' })
          await payments.processRefund(payment._id, key)
        }
      }
    }
  }
  await Booking.updateOne({ _id: cancelled._id }, { 'cancellation.refundPercent': refund.percent, 'cancellation.refundPaise': refund.refundPaise })

  if (by === 'owner') audit({ actorType: 'owner', actorId: byId, action: 'booking.owner_cancelled', targetType: 'Booking', targetId: cancelled._id, note: reason })
  if (by === 'admin') audit({ actorType: 'admin', actorId: byId, action: 'booking.admin_cancelled', targetType: 'Booking', targetId: cancelled._id, note: reason, meta: { refundPercent: refund.percent } })

  const refundText = refund.refundPaise ? ` ${money(refund.refundPaise)} will be refunded.` : ''
  if (by !== 'guest') notifyUser(cancelled.user, { title: 'Booking cancelled', message: `${cancelled.hotelName} on ${when(cancelled)} was cancelled by ${by === 'owner' ? 'the host' : 'support'}.${refundText}`, link: `/bookings/${cancelled._id}` })
  if (by !== 'owner') notifyOwner(cancelled.ownerId, { title: 'Booking cancelled', message: `${cancelled.guestName} - ${cancelled.hotelName}, ${when(cancelled)} was cancelled.`, link: '/hotel/bookings' })
  return Booking.findById(cancelled._id)
}

const CHECKIN_ATTEMPTS = 5
const LOCK_MINUTES = 15

/** The owner types the guest's code to start the stay. */
export async function checkInWithCode({ bookingId, ownerId, code, now = new Date() }) {
  const booking = await Booking.findOne({ _id: bookingId, ownerId }).select('+checkInCode +checkInLockedUntil')
  if (!booking) throw notFound('Booking not found')
  if (booking.status !== 'Confirmed') throw new HttpError(409, `This booking is ${booking.status.toLowerCase()}, so it cannot be checked in`)
  if (booking.checkInLockedUntil && booking.checkInLockedUntil > now) throw new HttpError(429, 'Too many wrong codes. Try again in a few minutes.')

  const settings = await Settings.get()
  const opensAt = new Date(booking.checkIn.getTime() - settings.checkInOpensHours * HOUR)
  if (now < opensAt) throw new HttpError(409, `Check-in opens ${settings.checkInOpensHours} hour(s) before the start`)
  if (now > booking.checkOut) throw new HttpError(409, 'This booking has already ended')

  const given = Buffer.from(String(code || '').trim())
  const real = Buffer.from(String(booking.checkInCode || ''))
  if (!given.length || given.length !== real.length || !crypto.timingSafeEqual(given, real)) {
    const bumped = await Booking.findOneAndUpdate({ _id: bookingId }, { $inc: { checkInAttempts: 1 } }, { returnDocument: 'after' }).select('+checkInAttempts')
    if (bumped.checkInAttempts >= CHECKIN_ATTEMPTS) {
      await Booking.updateOne({ _id: bookingId }, { checkInAttempts: 0, checkInLockedUntil: new Date(now.getTime() + LOCK_MINUTES * MIN) })
      throw new HttpError(429, 'Too many wrong codes. Try again in a few minutes.')
    }
    throw badRequest('That code is not correct')
  }

  const done = await setStatus({ _id: bookingId, ownerId }, ['Confirmed'], 'Checked In', { checkedInAt: now, checkInAttempts: 0 }, 'owner', 'Code verified')
  if (!done) throw new HttpError(409, 'This booking can no longer be checked in')
  notifyUser(done.user, { title: 'Checked in', message: `Welcome to ${done.hotelName}. Enjoy your stay!`, link: `/bookings/${done._id}` })
  return done
}

export async function checkOut({ bookingId, ownerId, now = new Date(), by = 'owner' }) {
  const done = await setStatus({ _id: bookingId, ...(ownerId ? { ownerId } : {}) }, ['Checked In'], 'Checked Out', { checkedOutAt: now }, by)
  if (!done) throw new HttpError(409, 'Only a checked-in booking can be checked out')
  notifyUser(done.user, { title: 'Thanks for staying', message: `How was ${done.hotelName}? Leave a review.`, link: '/profile/reviews' })
  return done
}

// ---- background work -------------------------------------------------------------------------------

async function sweep(filter, to, note, notify, patch = {}) {
  const stale = await Booking.find(filter).limit(100)
  let n = 0
  for (const b of stale) {
    const done = await setStatus({ _id: b._id }, [b.status], to, patch, 'system', note)
    if (!done) continue
    n++
    // Only holds are released here: a payment that lands right now turns the block into a confirmed one
    await AvailabilityBlock.updateMany({ booking: b._id, type: 'hold' }, { released: true })
    if (notify) notifyUser(done.user, notify(done))
  }
  return n
}

export async function runBookingJobs(now = new Date()) {
  const settings = await Settings.get()
  const r = {}
  r.requestsExpired = await sweep({ status: 'Requested', ownerResponseDueAt: { $lt: now } }, 'Expired', 'The owner did not respond in time', (b) => ({ title: 'Request expired', message: `${b.hotelName} did not reply in time. You have not been charged.`, link: `/bookings/${b._id}` }))
  r.paymentsExpired = await sweep({ status: 'Awaiting Payment', holdExpiresAt: { $lt: now } }, 'Expired', 'Payment was not completed in time', (b) => ({ title: 'Booking expired', message: `Your hold on ${b.hotelName} ended because payment was not completed.`, link: `/bookings/${b._id}` }))
  r.noShows = await sweep({ status: 'Confirmed', checkOut: { $lt: new Date(now.getTime() - settings.noShowGraceHours * HOUR) } }, 'No Show', 'Guest did not check in', null)
  r.autoCheckouts = await sweep({ status: 'Checked In', checkOut: { $lt: new Date(now.getTime() - settings.autoCheckoutGraceHours * HOUR) } }, 'Checked Out', 'Checked out automatically', null, { checkedOutAt: now })

  // Calendar rows that no longer matter
  await AvailabilityBlock.deleteMany({ released: true, updatedAt: { $lt: new Date(now.getTime() - 2 * 24 * HOUR) } })
  await AvailabilityBlock.deleteMany({ type: 'hold', expiresAt: { $lt: new Date(now.getTime() - 24 * HOUR) } })

  r.refundsRetried = await payments.retryRefunds()
  r.reconciled = await reconcilePayments(now)
  return r
}

// A payment the gateway captured but we never heard about (closed tab, missed webhook)
export async function reconcilePayments(now = new Date()) {
  let gw
  try { gw = gateway() } catch { return 0 }
  if (gw.mode !== 'razorpay') return 0
  const open = await Payment.find({ status: 'Created', createdAt: { $lt: new Date(now.getTime() - 5 * MIN), $gt: new Date(now.getTime() - 3 * 24 * HOUR) } }).limit(20)
  let n = 0
  for (const p of open) {
    try {
      const items = await gw.fetchOrderPayments(p.orderId)
      const hit = items.find((x) => x.status === 'captured' && x.amount === p.amountPaise)
      if (hit) { await confirmAfterPayment(p._id, hit, { now }); n++ }
    } catch (err) {
      console.error('Reconcile failed for', p.orderId, err.message)
    }
  }
  return n
}
