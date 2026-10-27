import mongoose from 'mongoose'
import Booking from '../../../models/Booking.model.js'
import Hotel from '../../../models/Hotel.model.js'
import Review from '../../../models/Review.model.js'
import Payment from '../../../models/Payment.model.js'
import PriceRule from '../../../models/PriceRule.model.js'
import Settings from '../../../models/Settings.model.js'
import User from '../models/User.model.js'
import { HttpError, badRequest, notFound } from '../../../utils/httpError.js'
import { gateway, mockSignature } from '../../../core/payments/gateway.js'
import { isDateStr, addDays, diffDays, utcToZoned, zonedToUtc } from '../../../utils/time.js'
import { daySlots, nightAvailability } from '../services/availability.service.js'
import { cancelBooking, confirmAfterPayment, createBooking, quoteBooking, startPayment } from '../services/booking.service.js'
import { guestView } from '../services/booking.view.js'

const validId = (id, what = 'Booking') => {
  if (!mongoose.isValidObjectId(id)) throw notFound(`${what} not found`)
  return id
}
const DAY = 24 * 60 * 60 * 1000
const startOfToday = () => zonedToUtc(utcToZoned(new Date()).date, '00:00')

async function currentUser(req) {
  const user = await User.findById(req.auth.id)
  if (!user || user.status !== 'Active') throw new HttpError(401, 'User session invalid or expired')
  return user
}

const ACTIVE = ['Requested', 'Awaiting Payment', 'Confirmed', 'Checked In', 'Pending']
const ENDED = ['Cancelled', 'Refunded', 'Rejected', 'Expired', 'Payment Failed']

function tabFilter(tab) {
  const today = startOfToday()
  if (tab === 'upcoming') return { status: { $in: ACTIVE }, checkOut: { $gte: today } }
  if (tab === 'cancelled') return { status: { $in: ENDED } }
  if (tab === 'past') return { $or: [{ status: { $in: ['Checked Out', 'No Show'] } }, { status: { $in: ACTIVE }, checkOut: { $lt: today } }] }
  return {}
}

// ---- public: what can be booked ---------------------------------------------------------------------------

// The booking set-up of a villa as the guest page needs it
export function bookingConfig(villa) {
  const m = villa.bookingModes || {}
  const toTime = (v) => v || ''
  return {
    confirmationMode: villa.confirmationMode || 'instant',
    timezone: villa.timezone || 'Asia/Kolkata',
    checkInTime: toTime(villa.checkInTime),
    checkOutTime: toTime(villa.checkOutTime),
    allowSameDay: villa.allowSameDay !== false,
    maxAdvanceDays: villa.maxAdvanceDays || 365,
    maxGuests: villa.maxGuests || 0,
    cleaningFeePaise: villa.pricing?.cleaningFeePaise || 0,
    night: { enabled: Boolean(m.night?.enabled), minNights: m.night?.minNights || 1, maxNights: m.night?.maxNights || 30, basePricePaise: villa.pricing?.basePricePaise || Math.round((villa.startingPrice || 0) * 100), weekendPricePaise: villa.pricing?.weekendPricePaise || 0, weeklyDiscountPct: villa.pricing?.weeklyDiscountPct || 0, monthlyDiscountPct: villa.pricing?.monthlyDiscountPct || 0 },
    dayUse: { enabled: Boolean(m.dayUse?.enabled), packages: (m.dayUse?.packages || []).map((p) => ({ id: String(p._id), name: p.name, startTime: p.startTime, endTime: p.endTime, pricePaise: p.pricePaise, maxGuests: p.maxGuests })) },
    hourly: { enabled: Boolean(m.hourly?.enabled), openTime: m.hourly?.openTime || '', closeTime: m.hourly?.closeTime || '', startStepMinutes: m.hourly?.startStepMinutes || 60, pricePerHourPaise: m.hourly?.pricePerHourPaise || 0, minHours: m.hourly?.minHours || 1, maxHours: m.hourly?.maxHours || 12, durations: (m.hourly?.durations || []).map((d) => ({ minutes: d.minutes, pricePaise: d.pricePaise })) },
  }
}

async function publicVilla(id) {
  const villa = await Hotel.findOne({ _id: validId(id, 'Villa'), status: 'Active' })
  if (!villa || (villa.listingStatus && villa.listingStatus !== 'Approved')) throw notFound('Villa not found')
  return villa
}

// GET /user/villas/:id/availability?from=YYYY-MM-DD&to=YYYY-MM-DD   (night stays, at most 92 days)
export async function villaAvailability(req, res) {
  const villa = await publicVilla(req.params.id)
  const from = isDateStr(req.query.from) ? req.query.from : new Date().toISOString().slice(0, 10)
  const to = isDateStr(req.query.to) ? req.query.to : addDays(from, 61)
  if (diffDays(from, to) < 1 || diffDays(from, to) > 92) throw badRequest('Choose a range of up to 92 days')
  const rules = await PriceRule.find({ villa: villa._id }).lean()
  res.json({ success: true, data: { from, to, nights: await nightAvailability(villa.toObject(), rules, from, to) } })
}

// GET /user/villas/:id/slots?date=YYYY-MM-DD   (day-use packages and hourly slots)
export async function villaSlots(req, res) {
  const villa = await publicVilla(req.params.id)
  if (!isDateStr(req.query.date)) throw badRequest('Choose a date')
  res.json({ success: true, data: await daySlots(villa.toObject(), req.query.date) })
}

// ---- booking -------------------------------------------------------------------------------------------------------

const selectionOf = (body) => body.selection || {}

// POST /user/bookings/quote   { villaId, mode, selection, guests, couponCode }  -> price breakdown, nothing is held
export async function quote(req, res) {
  const b = req.body || {}
  const { quote: q, available } = await quoteBooking({ villaId: validId(b.villaId, 'Villa'), mode: b.mode, selection: selectionOf(b), guests: b.guests, couponCode: b.couponCode })
  res.json({ success: true, data: { available, mode: q.mode, startAt: q.startAt, endAt: q.endAt, guests: q.guests, pricing: q.pricing } })
}

// POST /user/bookings   { villaId, mode, selection, guests, couponCode }   header: Idempotency-Key
export async function create(req, res) {
  const user = await currentUser(req)
  const b = req.body || {}
  const key = String(req.get('Idempotency-Key') || b.idempotencyKey || '').trim().slice(0, 80)
  const { booking, reused } = await createBooking({ user, villaId: validId(b.villaId, 'Villa'), mode: b.mode, selection: selectionOf(b), guests: b.guests, couponCode: b.couponCode, idempotencyKey: key })
  const [villa, settings] = await Promise.all([Hotel.findById(booking.hotel).lean(), Settings.get()])
  res.status(reused ? 200 : 201).json({ success: true, data: guestView(booking, { villa, settings }) })
}

async function ownBooking(req, withCode = false) {
  const q = Booking.findOne({ _id: validId(req.params.bookingId || req.params.id), user: req.auth.id })
  const booking = await (withCode ? q.select('+checkInCode') : q)
  if (!booking) throw notFound('Booking not found')
  return booking
}

export async function getOne(req, res) {
  const booking = await ownBooking(req, true)
  const [villa, review, settings] = await Promise.all([Hotel.findById(booking.hotel).lean(), Review.findOne({ booking: booking._id }).lean(), Settings.get()])
  res.json({ success: true, data: guestView(booking, { villa, review, settings }) })
}

export async function list(req, res) {
  const bookings = await Booking.find({ user: req.auth.id, ...tabFilter(req.query.tab) }).sort({ checkIn: req.query.tab === 'upcoming' ? 1 : -1 }).limit(100).select('+checkInCode')
  const [villas, reviews, settings] = await Promise.all([
    Hotel.find({ _id: { $in: [...new Set(bookings.map((b) => String(b.hotel)))] } }).select('coverImage city address mapUrl').lean(),
    Review.find({ booking: { $in: bookings.map((b) => b._id) } }).select('booking rating status').lean(),
    Settings.get(),
  ])
  const villaById = new Map(villas.map((v) => [String(v._id), v]))
  const reviewByBooking = new Map(reviews.map((r) => [String(r.booking), r]))
  res.json({ success: true, data: bookings.map((b) => guestView(b, { villa: villaById.get(String(b.hotel)), review: reviewByBooking.get(String(b._id)), settings })) })
}

// POST /user/bookings/:id/cancel   { reason }
export async function cancel(req, res) {
  const booking = await ownBooking(req)
  const cancelled = await cancelBooking({ bookingId: booking._id, by: 'guest', byId: req.auth.id, reason: String(req.body?.reason || '').trim() })
  const [villa, settings] = await Promise.all([Hotel.findById(cancelled.hotel).lean(), Settings.get()])
  res.json({ success: true, message: cancelled.cancellation?.refundPaise ? 'Booking cancelled. Your refund is on its way.' : 'Booking cancelled.', data: guestView(cancelled, { villa, settings }) })
}

// POST /user/bookings/:id/pay  -> what the checkout needs (order id, amount, gateway key)
export async function pay(req, res) {
  res.json({ success: true, data: await startPayment({ bookingId: validId(req.params.id), userId: req.auth.id }) })
}

async function finishPayment(req, res, gp, payment) {
  const result = await confirmAfterPayment(payment._id, gp)
  const booking = await Booking.findById(payment.booking).select('+checkInCode')
  const [villa, settings] = await Promise.all([Hotel.findById(booking.hotel).lean(), Settings.get()])
  const ok = booking.status === 'Confirmed' || ['Checked In', 'Checked Out'].includes(booking.status)
  res.status(ok ? 200 : 409).json({
    success: ok,
    message: ok ? 'Payment received. Your booking is confirmed!' : result.refunded ? 'That time was no longer available, so your payment is being refunded.' : 'Payment could not confirm this booking.',
    data: guestView(booking, { villa, settings }),
  })
}

// POST /user/bookings/:id/payment/verify   { orderId, paymentId, signature }  (what Razorpay checkout returns)
export async function verifyPayment(req, res) {
  const booking = await ownBooking(req)
  const { orderId, paymentId, signature } = req.body || {}
  const payment = await Payment.findOne({ booking: booking._id, orderId: String(orderId || '') })
  if (!payment) throw notFound('Payment not found')
  const gw = gateway()
  if (!gw.verifyCheckoutSignature({ orderId, paymentId, signature })) throw badRequest('Payment could not be verified')

  // Never trust the browser: read the payment from the gateway and check it is for this order and amount
  let gp = await gw.fetchPayment(paymentId)
  if (gp.order_id !== payment.orderId || gp.amount !== payment.amountPaise) throw badRequest('Payment does not match this booking')
  if (gp.status === 'authorized') gp = await gw.capturePayment(paymentId, payment.amountPaise)
  if (gp.status !== 'captured') return res.status(202).json({ success: true, message: 'Your payment is still being processed. We will confirm your booking shortly.', data: null })
  await finishPayment(req, res, gp, payment)
}

// POST /user/bookings/:id/payment/mock   - development only, when no Razorpay keys are set
export async function mockPayment(req, res) {
  const gw = gateway()
  if (gw.mode !== 'mock') throw notFound()
  const booking = await ownBooking(req)
  const payment = await Payment.findOne({ booking: booking._id, status: 'Created' }).sort({ createdAt: -1 })
  if (!payment) throw badRequest('Start the payment first')
  const gp = { id: `pay_mock_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, order_id: payment.orderId, amount: payment.amountPaise, status: 'captured', method: 'upi' }
  gp.signature = mockSignature(payment.orderId, gp.id)
  await finishPayment(req, res, gp, payment)
}

export const DAYS = DAY
