import Booking from '../../../models/Booking.model.js'
import Hotel from '../../../models/Hotel.model.js'
import RoomType from '../../../models/RoomType.model.js'
import Amenity from '../../../models/Amenity.model.js'
import Location from '../../../models/Location.model.js'
import Review from '../../../models/Review.model.js'
import Coupon from '../../../models/Coupon.model.js'
import Banner from '../../../models/Banner.model.js'
import Notification from '../../../models/Notification.model.js'
import Payment from '../../../models/Payment.model.js'
import Payout from '../../../models/Payout.model.js'
import SupportTicket from '../../../models/SupportTicket.model.js'
import ContactMessage from '../../../models/ContactMessage.model.js'
import User from '../../user/models/User.model.js'
import Admin from '../models/Admin.model.js'
import { badRequest } from '../../../utils/httpError.js'
import { recalcHotelRating } from '../../../utils/hotelRating.js'

const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')
const strip = (d) => {
  const { __v, ...rest } = d.toObject()
  return rest
}

// Resolves the hotel a record belongs to and copies its name onto the record.
async function attachHotel(data) {
  const hotel = await Hotel.findById(data.hotel)
  if (!hotel) throw badRequest('Hotel not found')
  data.hotelName = hotel.name
}

// { city -> count } for a list of docs, using one aggregate instead of a query per row
async function countBy(model, field, values) {
  const rows = await model.aggregate([{ $match: { [field]: { $in: values } } }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }])
  return Object.fromEntries(rows.map((r) => [String(r._id), r.n]))
}

// URL segment -> router config. Mounted under /api/admin/<segment>.
export const resources = {
  bookings: {
    model: Booking,
    searchFields: ['refId', 'guestName', 'hotelName', 'city'],
    actions: ['list', 'get', 'update', 'delete'],
    updateFields: ['status'],
    toRow: (d) => ({
      _id: d._id, refId: d.refId, guestName: d.guestName, hotelName: d.hotelName, city: d.city,
      checkIn: ymd(d.checkIn), checkOut: ymd(d.checkOut), guests: d.guests, amount: d.amount,
      commission: d.commission, status: d.status, createdAt: d.createdAt,
    }),
  },

  hotels: {
    model: Hotel,
    searchFields: ['refId', 'name', 'owner', 'city'],
    createFields: ['name', 'owner', 'coverImage', 'email', 'phone', 'description', 'address', 'city', 'state', 'pincode', 'rooms', 'startingPrice', 'checkInTime', 'checkOutTime'],
    updateFields: ['status', 'name', 'owner', 'coverImage', 'email', 'phone', 'description', 'address', 'city', 'state', 'pincode', 'rooms', 'startingPrice', 'checkInTime', 'checkOutTime'],
    beforeCreate: (data) => { data.status = 'Active' }, // hotels added by an admin skip the approval queue
    optionLabel: (d) => `${d.name} (${d.city})`,
    toRow: strip,
  },

  'room-types': {
    model: RoomType,
    searchFields: ['refId', 'name', 'hotelName'],
    createFields: ['hotel', 'name', 'capacity', 'price', 'status'],
    updateFields: ['hotel', 'name', 'capacity', 'price', 'status'],
    beforeCreate: attachHotel,
    beforeUpdate: async (doc, data) => { if (data.hotel) await attachHotel(data) },
    toRow: strip,
  },

  amenities: {
    model: Amenity,
    searchFields: ['refId', 'name', 'category'],
    createFields: ['name', 'category'],
    updateFields: ['name', 'category', 'status'],
    optionLabel: (d) => d.name,
    toRow: strip,
  },

  locations: {
    model: Location,
    searchFields: ['refId', 'city', 'state'],
    createFields: ['city', 'state'],
    updateFields: ['city', 'state', 'status'],
    optionLabel: (d) => d.city,
    optionValue: (d) => d.city,
    decorate: async (docs) => {
      const counts = await countBy(Hotel, 'city', docs.map((d) => d.city))
      return docs.map((d) => ({ ...strip(d), hotels: counts[d.city] || 0 }))
    },
  },

  customers: {
    model: User,
    searchFields: ['refId', 'name', 'email', 'phone'],
    actions: ['list', 'get', 'update', 'delete'],
    updateFields: ['status'],
    decorate: async (docs) => {
      const counts = await countBy(Booking, 'user', docs.map((d) => d._id))
      return docs.map((d) => ({ ...strip(d), bookings: counts[String(d._id)] || 0 }))
    },
  },

  reviews: {
    model: Review,
    searchFields: ['refId', 'guestName', 'hotelName', 'comment'],
    actions: ['list', 'get', 'create', 'update', 'delete'],
    // Reviews written by guests arrive through the app; an admin can also add one by hand
    createFields: ['hotel', 'guestName', 'rating', 'comment', 'status'],
    updateFields: ['status'],
    beforeCreate: async (data) => {
      await attachHotel(data)
      if (!data.status) data.status = 'Published'
    },
    afterChange: (doc) => recalcHotelRating(doc.hotel),
    toRow: strip,
  },

  coupons: {
    model: Coupon,
    searchFields: ['refId', 'couponCode'],
    createFields: ['couponCode', 'discountType', 'discountValue', 'validTill'],
    updateFields: ['discountType', 'discountValue', 'validTill', 'status'],
    optionLabel: (d) => `${d.couponCode} (${d.discountType === 'percent' ? d.discountValue + '%' : '₹' + d.discountValue} off, ${d.status})`,
    toRow: (d) => ({
      ...strip(d),
      discount: d.discountType === 'percent' ? `${d.discountValue}%` : `₹${d.discountValue}`,
      validTill: ymd(d.validTill),
    }),
  },

  banners: {
    model: Banner,
    searchFields: ['refId', 'title', 'position'],
    createFields: ['title', 'position', 'imageUrl', 'validTill'],
    updateFields: ['title', 'position', 'imageUrl', 'validTill', 'status'],
    optionLabel: (d) => `${d.title} (${d.position}, ${d.status})`,
    toRow: (d) => ({ ...strip(d), validTill: ymd(d.validTill) }),
  },

  notifications: {
    model: Notification,
    searchFields: ['refId', 'title', 'audience'],
    actions: ['list', 'get', 'create', 'delete'],
    createFields: ['title', 'message', 'audience'],
    // Delivery through a push service is not connected yet; the notification is logged as sent.
    beforeCreate: (data) => { data.status = 'Sent'; data.sentAt = new Date() },
    toRow: (d) => ({ ...strip(d), sentOn: ymd(d.sentAt || d.createdAt) }),
  },

  payments: {
    model: Payment,
    searchFields: ['refId', 'bookingCode', 'guestName', 'method'],
    actions: ['list', 'get', 'update', 'delete'],
    updateFields: ['status'],
    toRow: strip,
  },

  payouts: {
    model: Payout,
    searchFields: ['refId', 'hotelName', 'period'],
    actions: ['list', 'get', 'create', 'update', 'delete'],
    createFields: ['hotel', 'period', 'amount'],
    updateFields: ['status'],
    beforeCreate: attachHotel,
    toRow: strip,
  },

  'support-tickets': {
    model: SupportTicket,
    searchFields: ['refId', 'subject', 'raisedBy'],
    actions: ['list', 'get', 'update', 'delete'],
    updateFields: ['status', 'priority'],
    toRow: strip,
  },

  'contact-messages': {
    model: ContactMessage,
    searchFields: ['refId', 'name', 'email', 'message'],
    actions: ['list', 'get', 'update', 'delete'],
    updateFields: ['status'],
    toRow: (d) => ({ ...strip(d), receivedOn: ymd(d.createdAt) }),
  },

  'sub-admins': {
    model: Admin,
    baseFilter: { role: 'SUB_ADMIN' },
    searchFields: ['refId', 'name', 'email'],
    createFields: ['name', 'email', 'phone', 'designation'],
    updateFields: ['name', 'phone', 'designation', 'status'],
    beforeCreate: async (data, req) => {
      const password = String(req.body.password || '')
      if (password.length < 8) throw badRequest('Password must be at least 8 characters')
      data.passwordHash = await Admin.hashPassword(password)
      data.role = 'SUB_ADMIN'
    },
    toRow: (d) => ({ ...strip(d), role: d.designation }),
  },
}
