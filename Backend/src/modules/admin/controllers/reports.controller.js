import Booking, { REVENUE_STATUSES } from '../../../models/Booking.model.js'
import Hotel from '../../../models/Hotel.model.js'
import Payment from '../../../models/Payment.model.js'
import Payout from '../../../models/Payout.model.js'
import User from '../../user/models/User.model.js'

const sum = async (model, match, field) => {
  const [row] = await model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: `$${field}` } } }])
  return row?.total || 0
}

// Reports are computed from live data each time, so there is nothing to store.
export async function listReports(req, res) {
  const [bookings, revenue, hotels, customers, paid, payoutTotal, payoutCount] = await Promise.all([
    Booking.countDocuments(),
    sum(Booking, { status: { $in: REVENUE_STATUSES } }, 'amount'),
    Hotel.countDocuments(),
    User.countDocuments(),
    sum(Payment, { status: 'Paid' }, 'amount'),
    sum(Payout, { status: 'Processed' }, 'amount'),
    Payout.countDocuments(),
  ])
  const generatedOn = new Date().toISOString().slice(0, 10)
  const items = [
    { _id: 'bookings', name: 'Bookings Report', type: 'Bookings', records: bookings, value: revenue },
    { _id: 'hotels', name: 'Hotels Report', type: 'Hotels', records: hotels, value: null },
    { _id: 'customers', name: 'Customers Report', type: 'Customers', records: customers, value: null },
    { _id: 'payments', name: 'Payments Report', type: 'Finance', records: await Payment.countDocuments(), value: paid },
    { _id: 'payouts', name: 'Payouts Report', type: 'Finance', records: payoutCount, value: payoutTotal },
  ].map((r) => ({ ...r, generatedOn }))
  res.json({ success: true, data: { items, total: items.length, page: 1, pages: 1 } })
}
