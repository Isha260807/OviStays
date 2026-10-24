import Booking, { REVENUE_STATUSES } from '../../../models/Booking.model.js'
import Hotel from '../../../models/Hotel.model.js'
import RoomType from '../../../models/RoomType.model.js'
import Amenity from '../../../models/Amenity.model.js'
import SupportTicket from '../../../models/SupportTicket.model.js'
import User from '../../user/models/User.model.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const statusKey = {
  Pending: 'pending', Confirmed: 'confirmed', 'Checked In': 'checkedIn',
  'Checked Out': 'checkedOut', Cancelled: 'cancelled', Refunded: 'refunded',
}

function periodStart(period) {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (period) {
    case 'today': return startOfDay
    case 'week': {
      const monday = new Date(startOfDay)
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
      return monday
    }
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'year': return new Date(now.getFullYear(), 0, 1)
    default: return null // overall
  }
}

const signalType = (status) => ({
  Pending: 'booking_pending', 'Checked Out': 'booking_completed', Cancelled: 'booking_cancelled',
}[status] || 'booking_other')

export async function getDashboardStats(req, res) {
  const period = typeof req.query.period === 'string' ? req.query.period : 'overall'
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : ''
  const start = periodStart(period)

  const bookingMatch = {}
  if (city) bookingMatch.city = city
  if (start) bookingMatch.createdAt = { $gte: start }
  const hotelMatch = city ? { city } : {}

  const yearStart = new Date(new Date().getFullYear(), 0, 1)
  const monthlyMatch = { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: yearStart } }
  if (city) monthlyMatch.city = city

  const [byStatus, monthly, hotelsActive, hotelsPending, roomTypes, amenities, customers, openTickets, recentBookings, recentHotels, recentCustomers] =
    await Promise.all([
      Booking.aggregate([
        { $match: bookingMatch },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' }, commission: { $sum: '$commission' }, platformFee: { $sum: '$platformFee' }, gst: { $sum: '$gst' } } },
      ]),
      Booking.aggregate([
        { $match: monthlyMatch },
        { $group: { _id: { $month: '$createdAt' }, revenue: { $sum: '$amount' }, commission: { $sum: '$commission' }, bookings: { $sum: 1 } } },
      ]),
      Hotel.countDocuments({ ...hotelMatch, status: 'Active' }),
      Hotel.countDocuments({ ...hotelMatch, status: 'Pending' }),
      RoomType.countDocuments(),
      Amenity.countDocuments(),
      User.countDocuments(),
      SupportTicket.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
      Booking.find(city ? { city } : {}).sort({ createdAt: -1 }).limit(8),
      Hotel.find(hotelMatch).sort({ createdAt: -1 }).limit(4),
      User.find().sort({ createdAt: -1 }).limit(4),
    ])

  const counts = {}
  const totals = { revenue: 0, commission: 0, platformFee: 0, gst: 0, refunds: 0, bookings: 0 }
  for (const row of byStatus) {
    counts[statusKey[row._id]] = row.count
    totals.bookings += row.count
    if (REVENUE_STATUSES.includes(row._id)) {
      totals.revenue += row.amount
      totals.commission += row.commission
      totals.platformFee += row.platformFee
      totals.gst += row.gst
    }
    if (row._id === 'Refunded') totals.refunds += row.amount
  }

  const monthlyByNumber = Object.fromEntries(monthly.map((m) => [m._id, m]))
  const monthlyData = MONTHS.map((month, i) => ({
    month,
    revenue: monthlyByNumber[i + 1]?.revenue || 0,
    commission: monthlyByNumber[i + 1]?.commission || 0,
    bookings: monthlyByNumber[i + 1]?.bookings || 0,
  }))

  const liveSignals = [
    ...recentBookings.map((b) => ({
      type: signalType(b.status), title: `Booking ${b.refId} ${b.status.toLowerCase()}`,
      detail: `${b.guestName} at ${b.hotelName}`, at: b.createdAt,
    })),
    ...recentHotels.map((h) => ({
      type: 'hotel', title: h.status === 'Pending' ? 'Hotel awaiting approval' : 'Hotel registered',
      detail: `${h.name}, ${h.city}`, at: h.createdAt,
    })),
    ...recentCustomers.map((u) => ({ type: 'customer', title: 'New customer', detail: u.name, at: u.createdAt })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 12)

  res.json({
    success: true,
    data: {
      period,
      revenue: { total: totals.revenue },
      commission: { total: totals.commission },
      platformFee: { total: totals.platformFee },
      gst: { total: totals.gst },
      refunds: { total: totals.refunds },
      bookings: { total: totals.bookings, byStatus: counts },
      hotels: { total: hotelsActive, pendingRequests: hotelsPending },
      roomTypes: { total: roomTypes },
      amenities: { total: amenities },
      customers: { total: customers },
      tickets: { open: openTickets },
      monthlyData,
      liveSignals,
    },
  })
}
