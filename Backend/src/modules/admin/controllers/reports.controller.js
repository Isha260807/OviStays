import * as reports from '../services/reports.service.js'

// Each report is served as GET /api/admin/reports/<name>?...filters. The service does the work.
const handler = (fn) => async (req, res) => {
  res.json({ success: true, data: await fn(req.query, req.params) })
}

export const dailySales = handler(reports.dailySales)
export const transactions = handler(reports.transactions)
export const bookings = handler(reports.bookings)
export const tax = handler(reports.tax)
export const taxDetail = handler((query, params) => reports.taxDetail(params.hotelId, query))
export const adminEarnings = handler(reports.adminEarnings)
export const cancellations = handler(reports.cancellations)
export const hotelPerformance = handler(reports.hotelPerformance)
export const hotelPayouts = handler(reports.hotelPayouts)
export const topCustomers = handler(reports.topCustomers)
export const feedback = handler(reports.feedback)
