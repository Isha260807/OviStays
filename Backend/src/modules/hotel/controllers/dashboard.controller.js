import mongoose from 'mongoose'
import Booking, { REVENUE_STATUSES } from '../../../models/Booking.model.js'
import Hotel from '../../../models/Hotel.model.js'
import Review from '../../../models/Review.model.js'
import InboxNotification from '../../../models/InboxNotification.model.js'
import { badRequest, notFound } from '../../../utils/httpError.js'
import { addDays, isDateStr, utcToZoned, zonedToUtc } from '../../../utils/time.js'

// Everything here is scoped to the signed-in owner: ownerId comes from the token and is part of every match.

async function scope(req) {
  const match = { ownerId: req.owner._id }
  if (req.query.villa) {
    if (!mongoose.isValidObjectId(req.query.villa)) throw badRequest('Choose a valid villa')
    if (!(await Hotel.exists({ _id: req.query.villa, ownerId: req.owner._id }))) throw notFound('Villa not found')
    match.hotel = new mongoose.Types.ObjectId(req.query.villa)
  }
  const today = utcToZoned(new Date()).date // the owner's calendar day (India), not the UTC day
  const from = isDateStr(req.query.from) ? req.query.from : addDays(today, -29)
  const to = isDateStr(req.query.to) ? req.query.to : today
  if (to < from) throw badRequest('The end date is before the start date')
  return { match, from, to, start: zonedToUtc(from, '00:00'), end: zonedToUtc(addDays(to, 1), '00:00') }
}

// GET /hotel/dashboard?villa=&from=&to=
export async function stats(req, res) {
  const { match, from, to, start, end } = await scope(req)
  const now = new Date()
  const inRange = { ...match, createdAt: { $gte: start, $lt: end } }
  const sum = (field, statuses) => ({ $sum: { $cond: [{ $in: ['$status', statuses] }, field, 0] } })

  const [[totals], series, perVilla, arrivals, departures, counts, villaCounts] = await Promise.all([
    Booking.aggregate([
      { $match: inRange },
      { $group: {
        _id: null,
        bookings: { $sum: 1 },
        confirmed: { $sum: { $cond: [{ $in: ['$status', ['Confirmed', 'Checked In', 'Checked Out']] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $in: ['$status', ['Cancelled', 'Rejected', 'Expired']] }, 1, 0] } },
        grossPaise: sum('$pricing.totalPaise', REVENUE_STATUSES),
        earningsPaise: sum('$pricing.ownerPayoutPaise', REVENUE_STATUSES),
        commissionPaise: sum('$pricing.commissionPaise', REVENUE_STATUSES),
      } },
    ]),
    Booking.aggregate([
      { $match: { ...inRange, status: { $in: REVENUE_STATUSES } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, bookings: { $sum: 1 }, earningsPaise: { $sum: '$pricing.ownerPayoutPaise' } } },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([
      { $match: { ...inRange, status: { $in: REVENUE_STATUSES } } },
      { $group: { _id: '$hotel', name: { $first: '$hotelName' }, bookings: { $sum: 1 }, earningsPaise: { $sum: '$pricing.ownerPayoutPaise' } } },
      { $sort: { earningsPaise: -1 } },
    ]),
    Booking.find({ ...match, status: 'Confirmed', checkIn: { $gte: now, $lt: new Date(now.getTime() + 2 * 86400000) } }).sort({ checkIn: 1 }).limit(10).select('refId guestName hotelName checkIn mode guests').lean(),
    Booking.find({ ...match, status: 'Checked In', checkOut: { $lt: new Date(now.getTime() + 86400000) } }).sort({ checkOut: 1 }).limit(10).select('refId guestName hotelName checkOut mode guests').lean(),
    Promise.all([
      Booking.countDocuments({ ...match, status: 'Requested', ownerResponseDueAt: { $gt: now } }),
      Booking.countDocuments({ ...match, status: 'Awaiting Payment' }),
      Booking.countDocuments({ ...match, status: 'Checked In' }),
      Booking.countDocuments({ ...match, status: 'Confirmed', checkIn: { $gte: now, $lt: new Date(now.getTime() + 7 * 86400000) } }),
      InboxNotification.countDocuments({ ownerType: 'OWNER', ownerId: req.owner._id, readAt: null }),
    ]),
    Hotel.aggregate([{ $match: { ownerId: req.owner._id } }, { $group: { _id: '$listingStatus', n: { $sum: 1 } } }]),
  ])
  const [pending, awaitingPayment, inHouse, next7, unread] = counts
  const rating = await Review.aggregate([{ $match: { hotel: { $in: (await Hotel.find({ ownerId: req.owner._id }).select('_id').lean()).map((h) => h._id) }, status: 'Published' } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }])

  res.json({
    success: true,
    data: {
      range: { from, to },
      totals: totals || { bookings: 0, confirmed: 0, cancelled: 0, grossPaise: 0, earningsPaise: 0, commissionPaise: 0 },
      now: { pendingRequests: pending, awaitingPayment, inHouse, arrivingNext7Days: next7, unreadNotifications: unread },
      villas: Object.fromEntries(villaCounts.map((v) => [v._id || 'Draft', v.n])),
      rating: { average: rating[0] ? Math.round(rating[0].avg * 10) / 10 : 0, count: rating[0]?.n || 0 },
      series: series.map((s) => ({ date: s._id, bookings: s.bookings, earningsPaise: s.earningsPaise })),
      perVilla: perVilla.map((v) => ({ villaId: String(v._id), name: v.name, bookings: v.bookings, earningsPaise: v.earningsPaise })),
      arrivals: arrivals.map((b) => ({ id: String(b._id), code: b.refId, guest: b.guestName, villa: b.hotelName, at: b.checkIn, mode: b.mode, guests: b.guests })),
      departures: departures.map((b) => ({ id: String(b._id), code: b.refId, guest: b.guestName, villa: b.hotelName, at: b.checkOut, mode: b.mode, guests: b.guests })),
    },
  })
}

// GET /hotel/earnings?villa=&from=&to=&page=
// A stay's money is "earned" once the guest has checked out; before that it is confirmed but upcoming.
export async function earnings(req, res) {
  const { match, from, to, start, end } = await scope(req)
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = 20
  const filter = { ...match, status: { $in: REVENUE_STATUSES }, createdAt: { $gte: start, $lt: end } } // by the day the booking was made
  const [[sums], items, total] = await Promise.all([
    Booking.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        earnedPaise: { $sum: { $cond: [{ $in: ['$status', ['Checked Out', 'No Show']] }, '$pricing.ownerPayoutPaise', 0] } },
        upcomingPaise: { $sum: { $cond: [{ $in: ['$status', ['Confirmed', 'Checked In']] }, '$pricing.ownerPayoutPaise', 0] } },
        grossPaise: { $sum: '$pricing.totalPaise' },
        commissionPaise: { $sum: { $add: ['$pricing.commissionPaise', '$pricing.platformFeePaise', '$pricing.commissionGstPaise'] } },
      } },
    ]),
    Booking.find(filter).sort({ checkIn: -1 }).skip((page - 1) * limit).limit(limit).select('refId guestName hotelName checkIn checkOut status mode pricing').lean(),
    Booking.countDocuments(filter),
  ])
  res.json({
    success: true,
    data: {
      range: { from, to },
      summary: sums || { earnedPaise: 0, upcomingPaise: 0, grossPaise: 0, commissionPaise: 0 },
      items: items.map((b) => ({
        id: String(b._id), code: b.refId, guest: b.guestName, villa: b.hotelName, checkIn: b.checkIn, checkOut: b.checkOut, mode: b.mode, status: b.status,
        grossPaise: b.pricing?.totalPaise || 0,
        feesPaise: (b.pricing?.commissionPaise || 0) + (b.pricing?.platformFeePaise || 0) + (b.pricing?.commissionGstPaise || 0),
        payoutPaise: b.pricing?.ownerPayoutPaise || 0,
        payout: ['Checked Out', 'No Show'].includes(b.status) ? 'Earned' : 'Upcoming',
      })),
      total, page, pages: Math.max(1, Math.ceil(total / limit)),
    },
  })
}

// GET /hotel/reviews?villa=
export async function reviews(req, res) {
  const { match } = await scope(req)
  const villaIds = match.hotel ? [match.hotel] : (await Hotel.find({ ownerId: req.owner._id }).select('_id').lean()).map((h) => h._id)
  const items = await Review.find({ hotel: { $in: villaIds }, status: 'Published' }).sort({ createdAt: -1 }).limit(100).lean()
  res.json({ success: true, data: items.map((r) => ({ id: String(r._id), guest: r.guestName, villa: r.hotelName, rating: r.rating, comment: r.comment, date: r.createdAt })) })
}

// ---- notifications ---------------------------------------------------------------------------------------------

// An owner sees messages sent to them and broadcasts addressed to any of their villas
async function inboxFilter(req) {
  const villaIds = (await Hotel.find({ ownerId: req.owner._id }).select('_id').lean()).map((h) => h._id)
  return { $or: [{ ownerType: 'OWNER', ownerId: req.owner._id }, { ownerType: 'HOTEL', ownerId: { $in: villaIds } }] }
}

export async function notifications(req, res) {
  const filter = await inboxFilter(req)
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = 20
  const [items, total, unread] = await Promise.all([
    InboxNotification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    InboxNotification.countDocuments(filter),
    InboxNotification.countDocuments({ ...filter, readAt: null }),
  ])
  res.json({ success: true, data: { items: items.map((n) => ({ id: String(n._id), title: n.title, message: n.message, link: n.link, category: n.category, read: Boolean(n.readAt), createdAt: n.createdAt })), total, unread, page, pages: Math.max(1, Math.ceil(total / limit)) } })
}

export async function unreadCount(req, res) {
  res.json({ success: true, data: { count: await InboxNotification.countDocuments({ ...(await inboxFilter(req)), readAt: null }) } })
}

export async function markAllRead(req, res) {
  await InboxNotification.updateMany({ ...(await inboxFilter(req)), readAt: null }, { readAt: new Date() })
  res.json({ success: true })
}

export async function markRead(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Notification not found')
  await InboxNotification.updateOne({ _id: req.params.id, ...(await inboxFilter(req)) }, { readAt: new Date() })
  res.json({ success: true })
}
