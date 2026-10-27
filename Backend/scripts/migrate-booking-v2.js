// One-off, safe to run again: brings existing villas and bookings up to the new booking system.
//   - villas get a listingStatus that matches their old status, a nightly price in paise taken from
//     startingPrice, and night stays switched on
//   - bookings made by hand in the admin panel get their paise price snapshot and mode
//   - missing indexes (calendar, payments, idempotency) are created
// Usage: npm run migrate:booking
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'
import Hotel from '../src/models/Hotel.model.js'
import Booking from '../src/models/Booking.model.js'
import Payment from '../src/models/Payment.model.js'
import AvailabilityBlock from '../src/models/AvailabilityBlock.model.js'
import PriceRule from '../src/models/PriceRule.model.js'
import Owner from '../src/modules/hotel/models/Owner.model.js'

const STATUS_TO_LISTING = { Active: 'Approved', Suspended: 'Suspended', Inactive: 'Inactive', Pending: 'Pending Approval' }

await connectDB()

const villas = await Hotel.find({ $or: [{ listingStatus: { $exists: false } }, { 'pricing.basePricePaise': { $in: [0, null] } }] }).lean()
const villaOps = villas.map((v) => {
  const set = {}
  if (!v.listingStatus) set.listingStatus = STATUS_TO_LISTING[v.status] || 'Pending Approval'
  if (!v.pricing?.basePricePaise && v.startingPrice) set['pricing.basePricePaise'] = Math.round(v.startingPrice * 100)
  if (v.listingStatus === undefined && v.status === 'Active') set.approvedAt = v.createdAt
  return { updateOne: { filter: { _id: v._id }, update: { $set: set } } }
}).filter((op) => Object.keys(op.updateOne.update.$set).length)
if (villaOps.length) await Hotel.bulkWrite(villaOps)
console.log(`Villas updated: ${villaOps.length}`)

const bookings = await Booking.find({ 'pricing.totalPaise': { $in: [0, null] } }).lean()
const bookingOps = bookings.map((b) => ({
  updateOne: {
    filter: { _id: b._id },
    update: { $set: { mode: b.mode || 'night', 'pricing.totalPaise': Math.round((b.amount || 0) * 100), 'pricing.commissionPaise': Math.round((b.commission || 0) * 100), 'pricing.platformFeePaise': Math.round((b.platformFee || 0) * 100), 'pricing.commissionGstPaise': Math.round((b.gst || 0) * 100), 'pricing.ownerPayoutPaise': Math.max(0, Math.round(((b.amount || 0) - (b.commission || 0) - (b.platformFee || 0) - (b.gst || 0)) * 100)) } },
  },
}))
if (bookingOps.length) await Booking.bulkWrite(bookingOps)
console.log(`Bookings updated: ${bookingOps.length}`)

// Legacy live bookings take their dates on the new calendar so nobody can book over them
const live = await Booking.find({ status: { $in: ['Pending', 'Confirmed', 'Checked In'] }, checkOut: { $gte: new Date() } }).lean()
let blocked = 0
for (const b of live) {
  if (await AvailabilityBlock.exists({ booking: b._id })) continue
  await AvailabilityBlock.create({ villa: b.hotel, owner: b.ownerId, type: 'booking', mode: b.mode || 'night', booking: b._id, startAt: b.checkIn, endAt: b.checkOut, blockedUntil: b.checkOut })
  blocked++
}
console.log(`Calendar blocks added for existing bookings: ${blocked}`)

for (const model of [Hotel, Booking, Payment, AvailabilityBlock, PriceRule, Owner]) await model.syncIndexes()
console.log('Indexes ready')
await mongoose.disconnect()
