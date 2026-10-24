// Fills an EMPTY database with realistic sample data so the admin panel has something to show.
// Usage: npm run seed:demo        (refuses to run if hotels already exist)
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'
import Hotel from '../src/models/Hotel.model.js'
import RoomType from '../src/models/RoomType.model.js'
import Amenity from '../src/models/Amenity.model.js'
import Location from '../src/models/Location.model.js'
import Booking, { BOOKING_STATUSES } from '../src/models/Booking.model.js'
import Payment from '../src/models/Payment.model.js'
import Payout from '../src/models/Payout.model.js'
import Review from '../src/models/Review.model.js'
import Coupon from '../src/models/Coupon.model.js'
import Banner from '../src/models/Banner.model.js'
import Notification from '../src/models/Notification.model.js'
import SupportTicket from '../src/models/SupportTicket.model.js'
import ContactMessage from '../src/models/ContactMessage.model.js'
import User from '../src/modules/user/models/User.model.js'
import Admin from '../src/modules/admin/models/Admin.model.js'

await connectDB()
console.log(`Database: ${mongoose.connection.name}`)
if (await Hotel.estimatedDocumentCount()) {
  console.error('Hotels already exist in this database; refusing to add demo data.')
  process.exit(1)
}

const pick = (arr, i) => arr[i % arr.length]
const daysAgo = (n) => new Date(Date.now() - n * 86400000)
const daysFromNow = (n) => new Date(Date.now() + n * 86400000)

const cities = [['Jaipur', 'Rajasthan'], ['Udaipur', 'Rajasthan'], ['Goa', 'Goa'], ['Manali', 'Himachal Pradesh'], ['Mumbai', 'Maharashtra'], ['Delhi', 'Delhi']]
for (const [city, state] of cities) await Location.create({ city, state })

for (const [i, name] of ['Free WiFi', 'Air Conditioning', 'Swimming Pool', 'Parking', 'Breakfast', 'Gym', 'Spa', 'Room Service'].entries()) {
  await Amenity.create({ name, category: pick(['Basic', 'Comfort', 'Wellness', 'Dining'], i) })
}

const hotelNames = ['Grand Palace', 'Lake View Resort', 'Sea Breeze Inn', 'Hill Crest Stay', 'City Central Hotel', 'Royal Orchid', 'Sunrise Villa', 'Pearl Residency']
const owners = ['Ramesh Kumar', 'Sunita Rao', 'Imran Khan', 'Deepa Nair']
const hotels = []
for (const [i, name] of hotelNames.entries()) {
  const [city, state] = pick(cities, i)
  hotels.push(await Hotel.create({
    name, owner: pick(owners, i), email: `owner${i}@example.com`, phone: `98000000${10 + i}`,
    city, state, rooms: 12 + i * 6, startingPrice: 1800 + i * 400, rating: 3 + (i % 3),
    status: i === 6 ? 'Pending' : i === 7 ? 'Suspended' : 'Active',
  }))
}

const roomTypes = []
for (const [i, hotel] of hotels.entries()) {
  for (const [j, name] of ['Standard', 'Deluxe', 'Suite'].entries()) {
    roomTypes.push(await RoomType.create({ hotel: hotel._id, hotelName: hotel.name, name, capacity: 2 + j, price: 1800 + i * 300 + j * 900 }))
  }
}

const guestNames = ['Aarav Sharma', 'Priya Verma', 'Rohan Mehta', 'Sneha Iyer', 'Vikram Singh', 'Ananya Gupta', 'Karan Patel', 'Neha Joshi', 'Meera Das', 'Arjun Reddy']
const users = []
for (const [i, name] of guestNames.entries()) {
  users.push(await User.create({ name, email: `${name.split(' ')[0].toLowerCase()}@example.com`, phone: `9700000${100 + i}`, status: i === 9 ? 'Inactive' : 'Active', createdAt: daysAgo(i * 20) }))
}

const activeHotels = hotels.filter((h) => h.status === 'Active')
const bookings = []
for (let i = 0; i < 60; i++) {
  const hotel = pick(activeHotels, i)
  const rooms = roomTypes.filter((r) => String(r.hotel) === String(hotel._id))
  const room = pick(rooms, i)
  const user = pick(users, i * 3)
  const nights = 1 + (i % 4)
  const createdAt = daysAgo(Math.floor((i * 5.7) % 300))
  const checkIn = new Date(createdAt.getTime() + (2 + (i % 6)) * 86400000)
  bookings.push(await Booking.create({
    user: user._id, guestName: user.name, hotel: hotel._id, hotelName: hotel.name, city: hotel.city,
    roomType: room._id, guests: 1 + (i % 3), checkIn, checkOut: new Date(checkIn.getTime() + nights * 86400000),
    amount: room.price * nights, status: pick(BOOKING_STATUSES, i * 7 + (i % 5)), createdAt,
  }))
}

const methods = ['UPI', 'Card', 'Net Banking', 'Wallet', 'Cash']
for (const [i, b] of bookings.entries()) {
  const status = b.status === 'Refunded' ? 'Refunded' : b.status === 'Pending' ? 'Pending' : b.status === 'Cancelled' ? 'Failed' : 'Paid'
  await Payment.create({ booking: b._id, bookingCode: b.refId, guestName: b.guestName, method: pick(methods, i), amount: b.amount, status, createdAt: b.createdAt })
}

for (const [i, hotel] of activeHotels.entries()) {
  await Payout.create({ hotel: hotel._id, hotelName: hotel.name, period: `Oct 2026 - W${(i % 4) + 1}`, amount: 12000 + i * 3500, status: i % 2 ? 'Pending' : 'Processed' })
}

const comments = ['Great stay, friendly staff', 'Room was clean and spacious', 'Good value for money', 'Loved the view']
for (let i = 0; i < 12; i++) {
  const hotel = pick(activeHotels, i)
  await Review.create({ user: pick(users, i)._id, guestName: pick(users, i).name, hotel: hotel._id, hotelName: hotel.name, rating: 3 + (i % 3), comment: pick(comments, i), status: pick(['Published', 'Pending', 'Published'], i) })
}

await Coupon.create({ couponCode: 'WELCOME10', discountType: 'percent', discountValue: 10, validTill: daysFromNow(60), usedCount: 24 })
await Coupon.create({ couponCode: 'STAY500', discountType: 'flat', discountValue: 500, validTill: daysFromNow(30), usedCount: 9 })
await Coupon.create({ couponCode: 'MONSOON15', discountType: 'percent', discountValue: 15, validTill: daysAgo(10), usedCount: 51, status: 'Expired' })

await Banner.create({ title: 'Weekend Getaway', position: 'Home Top', validTill: daysFromNow(20), status: 'Active' })
await Banner.create({ title: 'Early Bird Offer', position: 'Home Middle', status: 'Draft' })

await Notification.create({ title: 'Festive offer is live', message: 'Flat 15% off on all stays', audience: 'All Users', sentAt: daysAgo(2) })

const tickets = [['Refund not received', 'High'], ['Unable to modify booking', 'Medium'], ['Room not as described', 'High'], ['Payment failed twice', 'Low']]
for (const [i, [subject, priority]] of tickets.entries()) {
  await SupportTicket.create({ subject, priority, raisedBy: pick(guestNames, i + 2), status: pick(['Open', 'In Progress', 'Resolved', 'Closed'], i) })
}

for (const [i, message] of ['I want to list my property', 'What is your cancellation policy?', 'Partnership enquiry'].entries()) {
  await ContactMessage.create({ name: pick(guestNames, i + 4), email: `contact${i}@example.com`, message })
}

await Admin.create({ name: 'Support Agent', email: 'support@ovistays.com', passwordHash: await Admin.hashPassword('ChangeMe@123'), role: 'SUB_ADMIN', designation: 'Support' })

console.log('Demo data created.')
await mongoose.disconnect()
