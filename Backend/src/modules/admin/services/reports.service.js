import mongoose from 'mongoose'
import Booking, { REVENUE_STATUSES } from '../../../models/Booking.model.js'
import Payment from '../../../models/Payment.model.js'
import Payout from '../../../models/Payout.model.js'
import Review from '../../../models/Review.model.js'
import Hotel from '../../../models/Hotel.model.js'
import { badRequest } from '../../../utils/httpError.js'

const MAX_LIMIT = 5000 // the export buttons ask for everything that matches
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const text = (v) => (typeof v === 'string' ? v.trim() : '')
const sum = (field) => ({ $sum: field })
const n = (v) => Math.round((Number(v) || 0) * 100) / 100

// ---- query helpers ----------------------------------------------------------------------------

function pageParams(query, defaultLimit = 20) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || defaultLimit))
  return { page, limit, skip: (page - 1) * limit }
}

const paged = (items, total, { page, limit }) => ({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })

// Date window from ?period=today|week|month|year, or ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive)
export function dateRange(query) {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (text(query.period)) {
    case 'today': return { $gte: startOfDay }
    case 'week': {
      const monday = new Date(startOfDay)
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
      return { $gte: monday }
    }
    case 'month': return { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }
    case 'year': return { $gte: new Date(now.getFullYear(), 0, 1) }
    default: break
  }
  const from = text(query.from) ? new Date(`${text(query.from)}T00:00:00`) : null
  const to = text(query.to) ? new Date(`${text(query.to)}T00:00:00`) : null
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) throw badRequest('Invalid date')
  if (!from && !to) return null
  const range = {}
  if (from) range.$gte = from
  if (to) range.$lt = new Date(to.getTime() + 86400000) // "to" is inclusive
  return range
}

const objectId = (v) => {
  const id = text(v)
  if (!id) return null
  if (!mongoose.isValidObjectId(id)) throw badRequest('Invalid hotel')
  return new mongoose.Types.ObjectId(id)
}

// Filters on the booking fields shared by most reports. `prefix` is used after a $lookup ("b.").
function bookingFilter(query, { prefix = '', withStatus = true, withDate = true } = {}) {
  const f = {}
  if (text(query.city)) f[`${prefix}city`] = text(query.city)
  const hotel = objectId(query.hotel)
  if (hotel) f[`${prefix}hotel`] = hotel
  if (withStatus && text(query.status)) f[`${prefix}status`] = text(query.status)
  const range = withDate && dateRange(query)
  if (range) f[`${prefix}createdAt`] = range
  return f
}

const searchOr = (query, fields) => {
  const q = text(query.search)
  if (!q) return null
  const rx = new RegExp(escapeRegex(q), 'i')
  return { $or: fields.map((f) => ({ [f]: rx })) }
}

const bookingRow = (b) => ({
  _id: b._id, refId: b.refId, guestName: b.guestName, hotelName: b.hotelName, city: b.city,
  checkIn: b.checkIn, checkOut: b.checkOut, amount: b.amount, commission: b.commission, platformFee: b.platformFee,
  gst: b.gst, adminEarning: n(b.commission + b.platformFee + b.gst), hotelEarning: n(b.amount - b.commission),
  status: b.status, createdAt: b.createdAt,
})

// ---- 1. Daily sales & cash audit --------------------------------------------------------------

export async function dailySales(query) {
  const date = text(query.date) || new Date().toISOString().slice(0, 10)
  const start = new Date(`${date}T00:00:00`)
  if (Number.isNaN(start.getTime())) throw badRequest('Invalid date')
  const day = { $gte: start, $lt: new Date(start.getTime() + 86400000) }

  const [bookings, payments] = await Promise.all([
    Booking.find({ createdAt: day }).sort({ createdAt: -1 }).limit(MAX_LIMIT).lean(),
    Payment.find({ createdAt: day }).limit(MAX_LIMIT).lean(),
  ])
  const payByBooking = new Map(payments.map((p) => [String(p.booking), p]))
  const earning = (b) => (b.commission || 0) + (b.platformFee || 0) + (b.gst || 0)
  const counted = bookings.filter((b) => REVENUE_STATUSES.includes(b.status))

  // How the money came in, per payment method
  const methods = {}
  for (const p of payments) {
    const m = (methods[p.method] ||= { method: p.method, paid: 0, paidCount: 0, pending: 0, failed: 0, refunded: 0 })
    if (p.status === 'Paid') { m.paid += p.amount; m.paidCount++ } else m[p.status.toLowerCase()] += p.amount
  }

  // Cash taken at the hotel desk is held by the hotel, so the platform's share of it is still owed.
  const cashPaid = payments.filter((p) => p.method === 'Cash' && p.status === 'Paid')
  const bookingById = new Map(bookings.map((b) => [String(b._id), b]))
  const platformShareOnCash = cashPaid.reduce((s, p) => s + earning(bookingById.get(String(p.booking)) || {}), 0)

  const hotels = new Map()
  for (const b of bookings) {
    const h = hotels.get(String(b.hotel)) || { hotelId: b.hotel, hotelName: b.hotelName, city: b.city, bookings: 0, gross: 0, onlineCollected: 0, cashCollected: 0, platformShareOnCash: 0 }
    h.bookings++
    if (REVENUE_STATUSES.includes(b.status)) h.gross += b.amount
    const p = payByBooking.get(String(b._id))
    if (p?.status === 'Paid') {
      if (p.method === 'Cash') { h.cashCollected += p.amount; h.platformShareOnCash += earning(b) } else h.onlineCollected += p.amount
    }
    hotels.set(String(b.hotel), h)
  }

  return {
    date,
    summary: {
      bookings: bookings.length,
      grossValue: n(counted.reduce((s, b) => s + b.amount, 0)),
      commission: n(counted.reduce((s, b) => s + (b.commission || 0), 0)),
      platformFee: n(counted.reduce((s, b) => s + (b.platformFee || 0), 0)),
      gst: n(counted.reduce((s, b) => s + (b.gst || 0), 0)),
      adminEarning: n(counted.reduce((s, b) => s + earning(b), 0)),
      collected: n(payments.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0)),
      pending: n(payments.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.amount, 0)),
      refunded: n(payments.filter((p) => p.status === 'Refunded').reduce((s, p) => s + p.amount, 0)),
      cashCollected: n(cashPaid.reduce((s, p) => s + p.amount, 0)),
      platformShareOnCash: n(platformShareOnCash),
    },
    methods: Object.values(methods).map((m) => ({ ...m, paid: n(m.paid), pending: n(m.pending), failed: n(m.failed), refunded: n(m.refunded) })),
    hotels: [...hotels.values()].map((h) => ({ ...h, gross: n(h.gross), onlineCollected: n(h.onlineCollected), cashCollected: n(h.cashCollected), platformShareOnCash: n(h.platformShareOnCash) })).sort((a, b) => b.gross - a.gross),
    bookings: bookings.map((b) => ({ ...bookingRow(b), paymentMethod: payByBooking.get(String(b._id))?.method || '', paymentStatus: payByBooking.get(String(b._id))?.status || 'No payment' })),
  }
}

// ---- 2. Transactions (payments) ---------------------------------------------------------------

export async function transactions(query) {
  const pg = pageParams(query)
  const paymentMatch = { ...(dateRange(query) && { createdAt: dateRange(query) }), ...(text(query.status) && { status: text(query.status) }), ...searchOr(query, ['bookingCode', 'guestName']) }
  // The date window applies to the payment itself, so only city and hotel are matched on the booking
  const joined = bookingFilter(query, { prefix: 'b.', withStatus: false, withDate: false })

  const [result] = await Payment.aggregate([
    { $match: paymentMatch },
    { $lookup: { from: 'bookings', localField: 'booking', foreignField: '_id', as: 'b' } },
    { $unwind: '$b' },
    { $match: joined },
    {
      $addFields: {
        hotelName: '$b.hotelName', city: '$b.city', itemAmount: '$b.amount', commission: '$b.commission',
        platformFee: '$b.platformFee', gst: '$b.gst', hotelEarning: { $subtract: ['$b.amount', '$b.commission'] },
        adminEarning: { $add: ['$b.commission', '$b.platformFee', '$b.gst'] },
      },
    },
    {
      $facet: {
        rows: [{ $sort: { createdAt: -1 } }, { $skip: pg.skip }, { $limit: pg.limit }, { $project: { b: 0, __v: 0 } }],
        byStatus: [{ $group: { _id: '$status', amount: sum('$amount'), count: sum(1), admin: sum('$adminEarning'), hotel: sum('$hotelEarning') } }],
      },
    },
  ])

  const by = Object.fromEntries(result.byStatus.map((s) => [s._id, s]))
  const total = result.byStatus.reduce((s, x) => s + x.count, 0)
  return {
    summary: {
      completedTransaction: n(by.Paid?.amount), completedCount: by.Paid?.count || 0,
      refundedTransaction: n(by.Refunded?.amount), refundedCount: by.Refunded?.count || 0,
      pendingTransaction: n(by.Pending?.amount), pendingCount: by.Pending?.count || 0,
      failedTransaction: n(by.Failed?.amount), failedCount: by.Failed?.count || 0,
      adminEarning: n(by.Paid?.admin), hotelEarning: n(by.Paid?.hotel),
    },
    ...paged(result.rows, total, pg),
  }
}

// ---- 3. Bookings ------------------------------------------------------------------------------

export async function bookings(query) {
  const pg = pageParams(query)
  const filter = { ...bookingFilter(query), ...searchOr(query, ['refId', 'guestName', 'hotelName']) }
  const [rows, total, stats] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
    Booking.countDocuments(filter),
    Booking.aggregate([{ $match: filter }, { $group: { _id: '$status', count: sum(1), amount: sum('$amount') } }]),
  ])
  const byStatus = Object.fromEntries(stats.map((s) => [s._id, s.count]))
  const revenue = stats.filter((s) => REVENUE_STATUSES.includes(s._id))
  const grossValue = revenue.reduce((a, s) => a + s.amount, 0)
  const revenueCount = revenue.reduce((a, s) => a + s.count, 0)
  return {
    summary: { total, byStatus, grossValue: n(grossValue), averageValue: revenueCount ? n(grossValue / revenueCount) : 0 },
    ...paged(rows.map(bookingRow), total, pg),
  }
}

// ---- 4. Tax (GST) -----------------------------------------------------------------------------

export async function tax(query) {
  const pg = pageParams(query)
  const match = { ...bookingFilter(query, { withStatus: false }), status: { $in: REVENUE_STATUSES } }
  const search = searchOr(query, ['hotelName'])
  const rows = await Booking.aggregate([
    { $match: { ...match, ...search } },
    {
      $group: {
        _id: '$hotel', hotelName: { $first: '$hotelName' }, city: { $first: '$city' }, bookings: sum(1),
        taxableValue: sum('$amount'), commission: sum('$commission'), platformFee: sum('$platformFee'), gst: sum('$gst'),
      },
    },
    { $addFields: { income: { $add: ['$commission', '$platformFee'] } } },
    { $sort: { gst: -1 } },
  ])
  const clean = rows.map((r) => ({ ...r, hotelId: r._id, taxableValue: n(r.taxableValue), commission: n(r.commission), platformFee: n(r.platformFee), income: n(r.income), gst: n(r.gst) }))
  return {
    summary: { totalIncome: n(clean.reduce((s, r) => s + r.income, 0)), totalTax: n(clean.reduce((s, r) => s + r.gst, 0)), taxableValue: n(clean.reduce((s, r) => s + r.taxableValue, 0)), bookings: clean.reduce((s, r) => s + r.bookings, 0) },
    ...paged(clean.slice(pg.skip, pg.skip + pg.limit), clean.length, pg),
  }
}

export async function taxDetail(hotelId, query) {
  const hotel = objectId(hotelId)
  if (!hotel) throw badRequest('Invalid hotel')
  const pg = pageParams(query)
  const filter = { ...bookingFilter({ ...query, hotel: undefined }, { withStatus: false }), hotel, status: { $in: REVENUE_STATUSES } }
  const [rows, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
    Booking.countDocuments(filter),
  ])
  return paged(rows.map(bookingRow), total, pg)
}

// ---- 5. Admin earnings ------------------------------------------------------------------------

export async function adminEarnings(query) {
  const pg = pageParams(query)
  const filter = { ...bookingFilter(query, { withStatus: false }), status: { $in: REVENUE_STATUSES }, ...searchOr(query, ['refId', 'hotelName', 'guestName']) }
  // Long windows are charted by month, short ones by day
  const byDay = ['today', 'week', 'month'].includes(text(query.period)) || (text(query.from) && text(query.to) && (new Date(query.to) - new Date(query.from)) / 86400000 <= 62)
  const format = byDay ? '%Y-%m-%d' : '%Y-%m'

  const [rows, total, series, totals] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
    Booking.countDocuments(filter),
    Booking.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format, date: '$createdAt' } }, bookings: sum(1), commission: sum('$commission'), platformFee: sum('$platformFee'), gst: sum('$gst') } },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([{ $match: filter }, { $group: { _id: null, bookings: sum(1), gross: sum('$amount'), commission: sum('$commission'), platformFee: sum('$platformFee'), gst: sum('$gst') } }]),
  ])
  const t = totals[0] || {}
  return {
    summary: { bookings: t.bookings || 0, grossValue: n(t.gross), commission: n(t.commission), platformFee: n(t.platformFee), gst: n(t.gst), total: n((t.commission || 0) + (t.platformFee || 0) + (t.gst || 0)) },
    series: series.map((s) => ({ label: s._id, bookings: s.bookings, commission: n(s.commission), platformFee: n(s.platformFee), gst: n(s.gst), total: n(s.commission + s.platformFee + s.gst) })),
    groupedBy: byDay ? 'day' : 'month',
    ...paged(rows.map(bookingRow), total, pg),
  }
}

// ---- 6. Cancellations & refunds ---------------------------------------------------------------

export async function cancellations(query) {
  const pg = pageParams(query)
  const base = bookingFilter(query, { withStatus: false })
  const filter = { ...base, status: { $in: ['Cancelled', 'Refunded'] }, ...(['Cancelled', 'Refunded'].includes(text(query.status)) && { status: text(query.status) }), ...searchOr(query, ['refId', 'guestName', 'hotelName']) }
  const [rows, total, stats, allCount, byHotel] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
    Booking.countDocuments(filter),
    Booking.aggregate([{ $match: { ...base, status: { $in: ['Cancelled', 'Refunded'] } } }, { $group: { _id: '$status', count: sum(1), amount: sum('$amount') } }]),
    Booking.countDocuments(base),
    Booking.aggregate([{ $match: { ...base, status: { $in: ['Cancelled', 'Refunded'] } } }, { $group: { _id: '$hotel', hotelName: { $first: '$hotelName' }, count: sum(1), amount: sum('$amount') } }, { $sort: { count: -1 } }, { $limit: 10 }]),
  ])
  const by = Object.fromEntries(stats.map((s) => [s._id, s]))
  const cancelled = by.Cancelled?.count || 0
  const refunded = by.Refunded?.count || 0
  return {
    summary: {
      cancelled, refunded, lostValue: n(by.Cancelled?.amount), refundedValue: n(by.Refunded?.amount),
      totalBookings: allCount, cancellationRate: allCount ? n(((cancelled + refunded) / allCount) * 100) : 0,
    },
    byHotel: byHotel.map((h) => ({ hotelId: h._id, hotelName: h.hotelName, count: h.count, amount: n(h.amount) })),
    ...paged(rows.map(bookingRow), total, pg),
  }
}

// ---- 7. Hotel performance and 8. payouts ------------------------------------------------------

async function hotelStats(query) {
  const hotelFilter = { ...(text(query.city) && { city: text(query.city) }), ...(objectId(query.hotel) && { _id: objectId(query.hotel) }), ...searchOr(query, ['name', 'city', 'owner']) }
  const range = dateRange(query)
  const bFilter = range ? { createdAt: range } : {}
  const [hotels, stats, ratings, payouts] = await Promise.all([
    Hotel.find(hotelFilter).select('name city owner status').lean(),
    Booking.aggregate([
      { $match: bFilter },
      {
        $group: {
          _id: '$hotel', bookings: sum(1),
          completed: sum({ $cond: [{ $eq: ['$status', 'Checked Out'] }, 1, 0] }),
          cancelled: sum({ $cond: [{ $in: ['$status', ['Cancelled', 'Refunded']] }, 1, 0] }),
          revenue: sum({ $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$amount', 0] }),
          commission: sum({ $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$commission', 0] }),
        },
      },
    ]),
    Review.aggregate([{ $match: { status: 'Published', ...(range && { createdAt: range }) } }, { $group: { _id: '$hotel', avg: { $avg: '$rating' }, count: sum(1) } }]),
    Payout.aggregate([{ $match: range ? { createdAt: range } : {} }, { $group: { _id: { hotel: '$hotel', status: '$status' }, amount: sum('$amount') } }]),
  ])
  const s = new Map(stats.map((x) => [String(x._id), x]))
  const r = new Map(ratings.map((x) => [String(x._id), x]))
  const paidOut = new Map(); const pending = new Map()
  for (const p of payouts) (p._id.status === 'Processed' ? paidOut : pending).set(String(p._id.hotel), p.amount)

  return hotels.map((h) => {
    const id = String(h._id)
    const st = s.get(id) || {}
    const revenue = st.revenue || 0
    const commission = st.commission || 0
    const earned = revenue - commission
    return {
      hotelId: h._id, hotelName: h.name, city: h.city, owner: h.owner, status: h.status,
      bookings: st.bookings || 0, completed: st.completed || 0, cancelled: st.cancelled || 0,
      cancellationRate: st.bookings ? n((st.cancelled / st.bookings) * 100) : 0,
      revenue: n(revenue), commission: n(commission), averageValue: st.bookings ? n(revenue / st.bookings) : 0,
      rating: r.get(id) ? n(r.get(id).avg) : 0, reviews: r.get(id)?.count || 0,
      earned: n(earned), paidOut: n(paidOut.get(id)), pendingPayout: n(pending.get(id)), balanceDue: n(earned - (paidOut.get(id) || 0)),
    }
  })
}

export async function hotelPerformance(query) {
  const pg = pageParams(query)
  const rows = (await hotelStats(query)).sort((a, b) => b.revenue - a.revenue)
  return {
    summary: { hotels: rows.length, activeHotels: rows.filter((h) => h.bookings > 0).length, revenue: n(rows.reduce((s, h) => s + h.revenue, 0)), commission: n(rows.reduce((s, h) => s + h.commission, 0)), bookings: rows.reduce((s, h) => s + h.bookings, 0) },
    ...paged(rows.slice(pg.skip, pg.skip + pg.limit), rows.length, pg),
  }
}

export async function hotelPayouts(query) {
  const pg = pageParams(query)
  const rows = (await hotelStats(query)).sort((a, b) => b.balanceDue - a.balanceDue)
  return {
    summary: { earned: n(rows.reduce((s, h) => s + h.earned, 0)), paidOut: n(rows.reduce((s, h) => s + h.paidOut, 0)), pendingPayout: n(rows.reduce((s, h) => s + h.pendingPayout, 0)), balanceDue: n(rows.reduce((s, h) => s + h.balanceDue, 0)) },
    ...paged(rows.slice(pg.skip, pg.skip + pg.limit), rows.length, pg),
  }
}

// ---- 9. Customers -----------------------------------------------------------------------------

export async function topCustomers(query) {
  const pg = pageParams(query)
  const range = dateRange(query)
  const match = { ...(range && { createdAt: range }), ...(text(query.city) && { city: text(query.city) }), ...searchOr(query, ['guestName']) }
  const [result] = await Booking.aggregate([
    { $match: match },
    { $sort: { createdAt: 1 } }, // so $last below is the name used most recently
    {
      $group: {
        // One row per account. Bookings without an account (walk-ins) are told apart by name.
        _id: { $ifNull: ['$user', '$guestName'] }, user: { $first: '$user' }, name: { $last: '$guestName' }, bookings: sum(1),
        completed: sum({ $cond: [{ $eq: ['$status', 'Checked Out'] }, 1, 0] }),
        cancelled: sum({ $cond: [{ $in: ['$status', ['Cancelled', 'Refunded']] }, 1, 0] }),
        spent: sum({ $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$amount', 0] }),
        lastBooking: { $max: '$createdAt' },
      },
    },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'u' } },
    { $sort: { spent: -1, bookings: -1, name: 1 } },
    {
      $facet: {
        rows: [{ $skip: pg.skip }, { $limit: pg.limit }],
        totals: [{ $group: { _id: null, customers: sum(1), spent: sum('$spent'), bookings: sum('$bookings') } }],
      },
    },
  ])
  const t = result.totals[0] || {}
  const items = result.rows.map((r) => ({
    userId: r.user || null, name: r.u[0]?.name || r.name, email: r.u[0]?.email || '', phone: r.u[0]?.phone || '',
    bookings: r.bookings, completed: r.completed, cancelled: r.cancelled, spent: n(r.spent), lastBooking: r.lastBooking,
  }))
  return {
    summary: { customers: t.customers || 0, bookings: t.bookings || 0, spent: n(t.spent), averageSpend: t.customers ? n(t.spent / t.customers) : 0 },
    ...paged(items, t.customers || 0, pg),
  }
}

// ---- 10. Guest feedback -----------------------------------------------------------------------

export async function feedback(query) {
  const pg = pageParams(query)
  const range = dateRange(query)
  const rating = parseInt(query.rating, 10)
  const hotel = objectId(query.hotel)
  const base = { ...(range && { createdAt: range }), ...(hotel && { hotel }) }
  const filter = { ...base, ...(rating >= 1 && rating <= 5 && { rating }), ...(text(query.status) && { status: text(query.status) }), ...searchOr(query, ['guestName', 'hotelName', 'comment']) }
  const [rows, total, dist] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
    Review.countDocuments(filter),
    Review.aggregate([{ $match: base }, { $group: { _id: '$rating', count: sum(1) } }]),
  ])
  const distribution = [5, 4, 3, 2, 1].map((star) => ({ rating: star, count: dist.find((d) => d._id === star)?.count || 0 }))
  const totalReviews = distribution.reduce((s, d) => s + d.count, 0)
  const average = totalReviews ? distribution.reduce((s, d) => s + d.rating * d.count, 0) / totalReviews : 0
  return {
    summary: { totalReviews, averageRating: n(average), positive: distribution.filter((d) => d.rating >= 4).reduce((s, d) => s + d.count, 0), negative: distribution.filter((d) => d.rating <= 2).reduce((s, d) => s + d.count, 0) },
    distribution,
    ...paged(rows.map(({ __v, ...r }) => r), total, pg),
  }
}
