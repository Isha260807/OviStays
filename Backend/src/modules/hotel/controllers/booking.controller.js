import mongoose from 'mongoose'
import Booking from '../../../models/Booking.model.js'
import Hotel from '../../../models/Hotel.model.js'
import Payment from '../../../models/Payment.model.js'
import { badRequest, notFound } from '../../../utils/httpError.js'
import { cancelBooking, checkInWithCode, checkOut, respondToRequest } from '../../user/services/booking.service.js'
import { ownerView } from '../../user/services/booking.view.js'
import { isDateStr, utcToZoned, zonedToUtc } from '../../../utils/time.js'

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const startOfDay = (offset = 0) => zonedToUtc(utcToZoned(new Date()).date, '00:00').getTime() + offset * 86400000

// Filters behind the owner's booking tabs. `now` is passed in so the rules read plainly.
function tabFilter(tab, now) {
  switch (tab) {
    case 'pending': return { status: 'Requested', ownerResponseDueAt: { $gt: now } }
    case 'awaiting': return { status: 'Awaiting Payment' }
    case 'confirmed': return { status: 'Confirmed' }
    case 'upcoming': return { status: 'Confirmed', checkIn: { $gte: now } }
    case 'arrivals': return { status: 'Confirmed', checkIn: { $lt: new Date(startOfDay(2)) }, checkOut: { $gte: now } }
    case 'inhouse': return { status: 'Checked In' }
    case 'past': return { status: { $in: ['Checked Out', 'No Show'] } }
    case 'cancelled': return { status: { $in: ['Cancelled', 'Rejected', 'Expired', 'Payment Failed', 'Refunded'] } }
    default: return {}
  }
}

export async function ownBooking(req, id = req.params.id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('Booking not found')
  const booking = await Booking.findOne({ _id: id, ownerId: req.owner._id })
  if (!booking) throw notFound('Booking not found')
  return booking
}

// GET /hotel/bookings?tab=&villa=&from=&to=&search=&page=&limit=
export async function list(req, res) {
  const q = req.query
  const now = new Date()
  const filter = { ownerId: req.owner._id, ...tabFilter(q.tab, now) }
  if (q.villa) {
    if (!mongoose.isValidObjectId(q.villa)) throw badRequest('Choose a valid villa')
    filter.hotel = q.villa
  }
  if (isDateStr(q.from)) filter.checkOut = { ...(filter.checkOut || {}), $gte: zonedToUtc(q.from, '00:00') }
  if (isDateStr(q.to)) filter.checkIn = { ...(filter.checkIn || {}), $lt: zonedToUtc(q.to, '23:59') }
  const search = String(q.search || '').trim()
  if (search) {
    const rx = new RegExp(escapeRx(search), 'i')
    filter.$or = [{ refId: rx }, { guestName: rx }, { hotelName: rx }]
  }
  const page = Math.max(1, parseInt(q.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(q.limit, 10) || 20))
  const sort = ['pending', 'upcoming', 'confirmed', 'arrivals', 'awaiting'].includes(q.tab) ? { checkIn: 1 } : { createdAt: -1 }

  const [items, total, pending] = await Promise.all([
    Booking.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Booking.countDocuments(filter),
    Booking.countDocuments({ ownerId: req.owner._id, status: 'Requested', ownerResponseDueAt: { $gt: now } }),
  ])
  res.json({ success: true, data: { items: items.map((b) => ownerView(b, { now })), total, page, pages: Math.max(1, Math.ceil(total / limit)), pendingRequests: pending } })
}

// GET /hotel/bookings/:id
export async function get(req, res) {
  const booking = await ownBooking(req)
  const [villa, payment] = await Promise.all([
    Hotel.findById(booking.hotel).select('name coverImage city address checkInTime checkOutTime').lean(),
    Payment.findOne({ booking: booking._id }).sort({ createdAt: -1 }).select('status method amountPaise paidAt refundedPaise refunds').lean(),
  ])
  res.json({
    success: true,
    data: {
      ...ownerView(booking),
      villa: villa ? { id: String(villa._id), name: villa.name, image: villa.coverImage, city: villa.city, address: villa.address } : null,
      payment: payment ? { status: payment.status, method: payment.method, amountPaise: payment.amountPaise, paidAt: payment.paidAt, refundedPaise: payment.refundedPaise } : null,
    },
  })
}

const reasonOf = (req) => String(req.body?.reason || '').trim().slice(0, 300)

export async function accept(req, res) {
  const booking = await ownBooking(req)
  const done = await respondToRequest({ bookingId: booking._id, ownerId: req.owner._id, accept: true })
  res.json({ success: true, message: 'Accepted. The guest can now pay to confirm.', data: ownerView(done) })
}

export async function reject(req, res) {
  const booking = await ownBooking(req)
  const done = await respondToRequest({ bookingId: booking._id, ownerId: req.owner._id, accept: false, reason: reasonOf(req) })
  res.json({ success: true, message: 'Request declined.', data: ownerView(done) })
}

// A confirmed booking cancelled by the host: the guest gets everything back
export async function cancel(req, res) {
  const booking = await ownBooking(req)
  if (!reasonOf(req)) throw badRequest('Please tell the guest why you are cancelling')
  const done = await cancelBooking({ bookingId: booking._id, by: 'owner', byId: req.owner._id, reason: reasonOf(req) })
  res.json({ success: true, message: 'Booking cancelled. The guest is being refunded in full.', data: ownerView(done) })
}

export async function checkIn(req, res) {
  const booking = await ownBooking(req)
  const done = await checkInWithCode({ bookingId: booking._id, ownerId: req.owner._id, code: req.body?.code })
  res.json({ success: true, message: 'Guest checked in.', data: ownerView(done) })
}

export async function checkOutGuest(req, res) {
  const booking = await ownBooking(req)
  const done = await checkOut({ bookingId: booking._id, ownerId: req.owner._id })
  res.json({ success: true, message: 'Guest checked out.', data: ownerView(done) })
}

