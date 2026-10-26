import mongoose from 'mongoose'
import User from '../models/User.model.js'
import Hotel from '../../../models/Hotel.model.js'
import Booking from '../../../models/Booking.model.js'
import Review from '../../../models/Review.model.js'
import SupportTicket from '../../../models/SupportTicket.model.js'
import InboxNotification from '../../../models/InboxNotification.model.js'
import Settings from '../../../models/Settings.model.js'
import { badRequest, HttpError } from '../../../utils/httpError.js'

// What a guest does after signing in: inbox, support tickets, their bookings and reviews.

const DAY = 24 * 60 * 60 * 1000
const toInt = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : fallback)

async function currentUser(req) {
  const user = await User.findById(req.auth.id)
  if (!user || user.status !== 'Active') throw new HttpError(401, 'User session invalid or expired')
  return user
}

const validId = (id, what = 'item') => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, `${what} not found`)
  return id
}

// ---- notifications ---------------------------------------------------------------------------

const inboxOwner = (req) => ({ ownerType: 'USER', ownerId: req.auth.id })

export async function listNotifications(req, res) {
  const limit = Math.min(toInt(req.query.limit, 20), 50)
  const page = toInt(req.query.page, 1)
  const owner = inboxOwner(req)
  const [items, total, unread] = await Promise.all([
    InboxNotification.find(owner).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    InboxNotification.countDocuments(owner),
    InboxNotification.countDocuments({ ...owner, readAt: null }),
  ])
  res.json({
    success: true,
    data: {
      items: items.map((n) => ({ id: String(n._id), title: n.title, message: n.message, link: n.link || '', category: n.category, read: Boolean(n.readAt), createdAt: n.createdAt })),
      unread,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
    },
  })
}

export async function unreadCount(req, res) {
  res.json({ success: true, data: { unread: await InboxNotification.countDocuments({ ...inboxOwner(req), readAt: null }) } })
}

export async function markNotificationRead(req, res) {
  await InboxNotification.updateOne({ _id: validId(req.params.id, 'Notification'), ...inboxOwner(req), readAt: null }, { readAt: new Date() })
  res.json({ success: true })
}

export async function markAllNotificationsRead(req, res) {
  await InboxNotification.updateMany({ ...inboxOwner(req), readAt: null }, { readAt: new Date() })
  res.json({ success: true })
}

// ---- support ---------------------------------------------------------------------------------

const FAQS = [
  { q: 'How do I book a villa?', a: 'Open a villa, pick your dates and the number of guests, and follow the steps to pay. You get a confirmation as soon as the booking is done.' },
  { q: 'Is the whole villa mine for the stay?', a: 'Yes. OviStays villas are private, so only your group stays there for the dates you booked.' },
  { q: 'Can I cancel or change my booking?', a: 'Cancellation rules are shown on every villa page and in our Cancellation Policy. Refunds follow that policy.' },
  { q: 'How are refunds paid?', a: 'Eligible refunds go back to the original payment method. Please allow up to 7 working days.' },
  { q: 'Which ID do I need at check-in?', a: 'Every guest needs a valid government ID such as Aadhaar, Passport, Driving Licence or Voter ID.' },
  { q: 'I could not log in. What should I do?', a: 'Check that the mobile number is right and request a new OTP. If it still fails, raise a ticket below and we will help.' },
]

export async function supportInfo(req, res) {
  const s = await Settings.get()
  res.json({
    success: true,
    data: {
      email: s.supportEmail || s.email || '',
      phone: s.supportPhone || (s.phoneNumber ? `${s.phoneCountryCode} ${s.phoneNumber}` : ''),
      hours: s.supportHours || '',
      faqs: FAQS,
    },
  })
}

const ticketView = (t) => ({ id: String(t._id), code: t.refId, subject: t.subject, description: t.description, status: t.status, priority: t.priority, createdAt: t.createdAt, updatedAt: t.updatedAt })

export async function listTickets(req, res) {
  const tickets = await SupportTicket.find({ user: req.auth.id }).sort({ createdAt: -1 }).limit(50).lean()
  res.json({ success: true, data: tickets.map(ticketView) })
}

export async function createTicket(req, res) {
  const user = await currentUser(req)
  const subject = String(req.body.subject || '').trim()
  const description = String(req.body.description || '').trim()
  if (subject.length < 3 || subject.length > 100) throw badRequest('Subject must be between 3 and 100 characters')
  if (description.length < 10 || description.length > 1000) throw badRequest('Please describe the problem in 10 to 1000 characters')

  const open = await SupportTicket.countDocuments({ user: user._id, status: { $in: ['Open', 'In Progress'] } })
  if (open >= 5) throw badRequest('You already have 5 open tickets. Please wait for a reply before raising more.')

  const ticket = await SupportTicket.create({ user: user._id, subject, description, raisedBy: user.name || user.phone, raisedByType: 'User' })
  res.status(201).json({ success: true, message: 'Your request has been sent. We will get back to you soon.', data: ticketView(ticket) })
}

// ---- bookings --------------------------------------------------------------------------------

const ACTIVE_STATUSES = ['Pending', 'Confirmed', 'Checked In']
const CANCELLED_STATUSES = ['Cancelled', 'Refunded']
const startOfToday = () => new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z')

function tabFilter(tab) {
  const today = startOfToday()
  if (tab === 'upcoming') return { status: { $in: ACTIVE_STATUSES }, checkOut: { $gte: today } }
  if (tab === 'cancelled') return { status: { $in: CANCELLED_STATUSES } }
  if (tab === 'past') return { $or: [{ status: 'Checked Out' }, { status: { $in: ACTIVE_STATUSES }, checkOut: { $lt: today } }] }
  return {}
}

export async function listBookings(req, res) {
  const filter = { user: req.auth.id, ...tabFilter(req.query.tab) }
  const bookings = await Booking.find(filter).sort({ checkIn: req.query.tab === 'upcoming' ? 1 : -1 }).limit(100).lean()

  const hotelIds = [...new Set(bookings.map((b) => String(b.hotel)))]
  const [hotels, reviews] = await Promise.all([
    Hotel.find({ _id: { $in: hotelIds } }).select('coverImage city').lean(),
    Review.find({ booking: { $in: bookings.map((b) => b._id) } }).select('booking rating status').lean(),
  ])
  const hotelById = new Map(hotels.map((h) => [String(h._id), h]))
  const reviewByBooking = new Map(reviews.map((r) => [String(r.booking), r]))

  res.json({
    success: true,
    data: bookings.map((b) => {
      const review = reviewByBooking.get(String(b._id))
      return {
        id: String(b._id),
        code: b.refId,
        villaId: String(b.hotel),
        villaName: b.hotelName,
        city: b.city || hotelById.get(String(b.hotel))?.city || '',
        image: hotelById.get(String(b.hotel))?.coverImage || '',
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        nights: Math.max(Math.round((new Date(b.checkOut) - new Date(b.checkIn)) / DAY), 1),
        guests: b.guests,
        amount: b.amount,
        status: b.status,
        review: review ? { rating: review.rating, status: review.status } : null,
        canReview: b.status === 'Checked Out' && !review,
      }
    }),
  })
}

// ---- reviews ---------------------------------------------------------------------------------

const reviewView = (r) => ({ id: String(r._id), villaId: String(r.hotel), villaName: r.hotelName, rating: r.rating, comment: r.comment || '', status: r.status, createdAt: r.createdAt })

// A guest can review a stay once it is over. Reviews go live after the admin approves them.
export async function createReview(req, res) {
  const user = await currentUser(req)
  const booking = await Booking.findOne({ _id: validId(req.params.bookingId, 'Booking'), user: user._id })
  if (!booking) throw new HttpError(404, 'Booking not found')
  if (booking.status !== 'Checked Out') throw badRequest('You can review a stay after you have checked out')

  const rating = Number(req.body.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest('Please choose a rating from 1 to 5')
  const comment = String(req.body.comment || '').trim()
  if (comment.length > 500) throw badRequest('Review can be up to 500 characters')

  try {
    const review = await Review.create({ user: user._id, booking: booking._id, guestName: user.name, hotel: booking.hotel, hotelName: booking.hotelName, rating, comment, status: 'Pending' })
    res.status(201).json({ success: true, message: 'Thanks for your review! It will appear once it is approved.', data: reviewView(review) })
  } catch (err) {
    if (err?.code === 11000) throw badRequest('You have already reviewed this stay')
    throw err
  }
}

export async function listMyReviews(req, res) {
  const reviews = await Review.find({ user: req.auth.id }).sort({ createdAt: -1 }).limit(100).lean()
  res.json({ success: true, data: reviews.map(reviewView) })
}

export async function deleteMyReview(req, res) {
  const result = await Review.deleteOne({ _id: validId(req.params.id, 'Review'), user: req.auth.id })
  if (!result.deletedCount) throw new HttpError(404, 'Review not found')
  res.json({ success: true })
}
