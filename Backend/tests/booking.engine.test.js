import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { connect, disconnect, fakeGateway, futureDate, makeOwner, makeUser, makeVilla, setSettings } from './helpers.js'
import Booking from '../src/models/Booking.model.js'
import Payment from '../src/models/Payment.model.js'
import AvailabilityBlock from '../src/models/AvailabilityBlock.model.js'
import Hotel from '../src/models/Hotel.model.js'
import { cancelBooking, checkInWithCode, checkOut, confirmAfterPayment, createBooking, respondToRequest, runBookingJobs, startPayment } from '../src/modules/user/services/booking.service.js'
import { daySlots, nightAvailability } from '../src/modules/user/services/availability.service.js'
import { addDays, utcToZoned, zonedToUtc } from '../src/utils/time.js'

let gwCalls
before(async () => {
  await connect()
  gwCalls = fakeGateway().calls
  await setSettings({ refundTiers: [{ hoursBeforeStart: 72, refundPercent: 100 }, { hoursBeforeStart: 24, refundPercent: 50 }] })
})
after(disconnect)

const night = (inDays, nights = 2) => ({ checkIn: futureDate(inDays), checkOut: futureDate(inDays + nights) })
const book = (user, villa, mode, selection, extra = {}) => createBooking({ user, villaId: villa._id, mode, selection, guests: 2, ...extra })
const gp = (payment) => ({ id: `pay_${payment._id}`, order_id: payment.orderId, amount: payment.amountPaise, status: 'captured', method: 'card' })

async function payFor(booking, userId) {
  await startPayment({ bookingId: booking._id, userId })
  const payment = await Payment.findOne({ booking: booking._id }).sort({ createdAt: -1 })
  return { payment, result: await confirmAfterPayment(payment._id, gp(payment)) }
}

test('instant booking: hold, pay, confirm, code, check in, check out', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner); const user = await makeUser()
  const { booking } = await book(user, villa, 'night', night(20))
  assert.equal(booking.status, 'Awaiting Payment')
  assert.equal(booking.pricing.totalPaise > 0, true)
  assert.equal(await AvailabilityBlock.countDocuments({ booking: booking._id, type: 'hold' }), 1)

  const { result } = await payFor(booking, user._id)
  assert.equal(result.booking.status, 'Confirmed')
  const full = await Booking.findById(booking._id).select('+checkInCode')
  assert.match(full.checkInCode, /^\d{6}$/)
  assert.equal(full.paymentStatus, 'Paid')
  assert.equal(await AvailabilityBlock.countDocuments({ booking: booking._id, type: 'booking' }), 1)

  // check-in needs the right code, and only for the owner of that villa
  const soon = new Date(full.checkIn.getTime() - 60 * 60 * 1000)
  await assert.rejects(checkInWithCode({ bookingId: booking._id, ownerId: owner._id, code: '000000', now: soon }), /not correct/)
  const stranger = await makeOwner()
  await assert.rejects(checkInWithCode({ bookingId: booking._id, ownerId: stranger._id, code: full.checkInCode, now: soon }), /not found/)
  await assert.rejects(checkInWithCode({ bookingId: booking._id, ownerId: owner._id, code: full.checkInCode }), /opens/)
  const inn = await checkInWithCode({ bookingId: booking._id, ownerId: owner._id, code: full.checkInCode, now: soon })
  assert.equal(inn.status, 'Checked In')
  const out = await checkOut({ bookingId: booking._id, ownerId: owner._id })
  assert.equal(out.status, 'Checked Out')
})

test('wrong check-in codes lock the booking after 5 tries', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner); const user = await makeUser()
  const { booking } = await book(user, villa, 'night', night(25))
  await payFor(booking, user._id)
  const b = await Booking.findById(booking._id)
  const soon = new Date(b.checkIn.getTime() - 60 * 60 * 1000)
  for (let i = 0; i < 4; i++) await assert.rejects(checkInWithCode({ bookingId: b._id, ownerId: owner._id, code: '111111', now: soon }), /not correct/)
  await assert.rejects(checkInWithCode({ bookingId: b._id, ownerId: owner._id, code: '111111', now: soon }), /Too many/)
  await assert.rejects(checkInWithCode({ bookingId: b._id, ownerId: owner._id, code: '111111', now: soon }), /Too many/)
})

test('ten guests racing for the same dates: exactly one wins', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner)
  const users = await Promise.all(Array.from({ length: 10 }, () => makeUser()))
  const results = await Promise.allSettled(users.map((u) => book(u, villa, 'night', night(30))))
  const won = results.filter((r) => r.status === 'fulfilled')
  assert.equal(won.length, 1)
  for (const r of results.filter((x) => x.status === 'rejected')) assert.ok([409, 503].includes(r.reason.status), r.reason.message)
  assert.equal(await AvailabilityBlock.countDocuments({ villa: villa._id, released: false }), 1)
})

test('night stay, day use and hourly slot all share one calendar', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner)
  const a = await makeUser(); const b = await makeUser(); const c = await makeUser()
  const day = futureDate(40)
  // day-use 10:00-18:00 on `day`
  const pkg = villa.bookingModes.dayUse.packages[0]
  await book(a, villa, 'dayUse', { date: day, packageId: String(pkg._id) })
  // an hourly slot inside that window is refused, one after it is fine
  await assert.rejects(book(b, villa, 'hourly', { date: day, startTime: '14:00', durationMinutes: 120 }), (e) => e.status === 409)
  const ok = await book(b, villa, 'hourly', { date: day, startTime: '19:00', durationMinutes: 120 })
  assert.equal(ok.booking.mode, 'hourly')
  // a night stay that covers the day-use window is refused
  await assert.rejects(book(c, villa, 'night', { checkIn: addDays(day, -1), checkOut: addDays(day, 1) }), (e) => e.status === 409)
  // ...and so is one that starts the same day at 12:00, because day-use runs until 18:00
  await assert.rejects(book(c, villa, 'night', { checkIn: day, checkOut: addDays(day, 1) }), (e) => e.status === 409)
  // while a night stay on the free days around it is fine
  await book(c, villa, 'night', { checkIn: addDays(day, 3), checkOut: addDays(day, 5) })
})

test('a guest can choose a later check-in and an earlier check-out, never more than the villa allows', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner); const a = await makeUser(); const b = await makeUser()
  const d = futureDate(330)
  const sel = (extra) => ({ checkIn: d, checkOut: addDays(d, 1), ...extra })
  await assert.rejects(book(a, villa, 'night', sel({ checkInTime: '10:00' })), /possible from 12:00/)
  await assert.rejects(book(a, villa, 'night', sel({ checkOutTime: '13:00' })), /by 11:00/)
  await assert.rejects(book(a, villa, 'night', sel({ checkInTime: 'abc' })), /valid check-in time/)
  const { booking } = await book(a, villa, 'night', sel({ checkInTime: '18:30', checkOutTime: '09:00' }))
  assert.equal(booking.checkIn.toISOString(), zonedToUtc(d, '18:30').toISOString())
  assert.equal(booking.checkOut.toISOString(), zonedToUtc(addDays(d, 1), '09:00').toISOString())
  // the hours the first guest did not use are free for someone else, for example a day-use package that ends before 18:30
  const free = await book(b, villa, 'dayUse', { date: d, packageId: String(villa.bookingModes.dayUse.packages[0]._id) })
  assert.equal(free.booking.mode, 'dayUse')
})

test('check-out day is free for the next guest: a slot is just check-in time to check-out time', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner); const a = await makeUser(); const b = await makeUser()
  await book(a, villa, 'night', night(50, 2))
  await book(b, villa, 'night', { checkIn: futureDate(52), checkOut: futureDate(54) }) // arrives 12:00, right after the 11:00 check-out
  await assert.rejects(book(b, villa, 'night', { checkIn: futureDate(51), checkOut: futureDate(53) }), (e) => e.status === 409) // overlaps the first stay
})

test('the public calendar shows nights as taken and slots as full', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner); const user = await makeUser()
  await book(user, villa, 'night', night(60, 2))
  const nights = await nightAvailability(villa.toObject(), [], futureDate(58), futureDate(64))
  const byDate = Object.fromEntries(nights.map((n) => [n.date, n.available]))
  assert.equal(byDate[futureDate(59)], true)
  assert.equal(byDate[futureDate(60)], false)
  assert.equal(byDate[futureDate(61)], false)
  assert.equal(byDate[futureDate(62)], true)
  const slots = await daySlots(villa.toObject(), futureDate(60))
  assert.equal(slots.dayUse[0].available, false)
})

test('request-to-book: owner accepts, guest pays; or owner rejects and the dates free up', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner, { confirmationMode: 'request' })
  const a = await makeUser(); const b = await makeUser()
  const { booking } = await book(a, villa, 'night', night(70))
  assert.equal(booking.status, 'Requested')
  await assert.rejects(startPayment({ bookingId: booking._id, userId: a._id }), /not accepted/)
  await assert.rejects(book(b, villa, 'night', night(70)), (e) => e.status === 409) // held while the owner decides

  const other = await makeOwner()
  await assert.rejects(respondToRequest({ bookingId: booking._id, ownerId: other._id, accept: true }), /not found/)
  const accepted = await respondToRequest({ bookingId: booking._id, ownerId: owner._id, accept: true })
  assert.equal(accepted.status, 'Awaiting Payment')
  await assert.rejects(respondToRequest({ bookingId: booking._id, ownerId: owner._id, accept: false }), /already answered/)
  const { result } = await payFor(booking, a._id)
  assert.equal(result.booking.status, 'Confirmed')

  const { booking: r2 } = await book(b, villa, 'night', night(80))
  const rejected = await respondToRequest({ bookingId: r2._id, ownerId: owner._id, accept: false, reason: 'Maintenance' })
  assert.equal(rejected.status, 'Rejected')
  await book(a, villa, 'night', night(80)) // free again
})

test('an unanswered request and an unpaid hold both expire and free the dates', async () => {
  const owner = await makeOwner(); const req = await makeVilla(owner, { confirmationMode: 'request' }); const inst = await makeVilla(owner)
  const a = await makeUser(); const b = await makeUser()
  const { booking: r } = await book(a, req, 'night', night(90))
  const { booking: i } = await book(a, inst, 'night', night(90))
  const later = new Date(Date.now() + 25 * 60 * 60 * 1000)
  const out = await runBookingJobs(later)
  assert.ok(out.requestsExpired >= 1 && out.paymentsExpired >= 1)
  assert.equal((await Booking.findById(r._id)).status, 'Expired')
  assert.equal((await Booking.findById(i._id)).status, 'Expired')
  await book(b, req, 'night', night(90))
  await book(b, inst, 'night', night(90))
})

test('a payment arriving after the hold lapsed still confirms when the dates are free', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner); const user = await makeUser()
  const { booking } = await book(user, villa, 'night', night(100))
  await startPayment({ bookingId: booking._id, userId: user._id })
  await runBookingJobs(new Date(Date.now() + 60 * 60 * 1000)) // hold expires while the guest is paying
  assert.equal((await Booking.findById(booking._id)).status, 'Expired')
  const payment = await Payment.findOne({ booking: booking._id })
  const res = await confirmAfterPayment(payment._id, gp(payment))
  assert.equal(res.booking.status, 'Confirmed')
})

test('a late payment for dates someone else took is refunded in full', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner); const a = await makeUser(); const b = await makeUser()
  const { booking } = await book(a, villa, 'night', night(110))
  await startPayment({ bookingId: booking._id, userId: a._id })
  await runBookingJobs(new Date(Date.now() + 60 * 60 * 1000))
  await book(b, villa, 'night', night(110)) // the dates were free again, b takes them
  const payment = await Payment.findOne({ booking: booking._id })
  const before = gwCalls.refunds.length
  const res = await confirmAfterPayment(payment._id, gp(payment))
  assert.equal(res.refunded, true)
  assert.equal(gwCalls.refunds.length, before + 1)
  assert.equal(gwCalls.refunds.at(-1).amountPaise, payment.amountPaise)
  const after = await Booking.findById(booking._id)
  assert.notEqual(after.status, 'Confirmed')
  assert.equal(after.paymentStatus, 'Refunded')
})

test('a payment reported twice is only counted once', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner); const user = await makeUser()
  const { booking } = await book(user, villa, 'night', night(120))
  await startPayment({ bookingId: booking._id, userId: user._id })
  const payment = await Payment.findOne({ booking: booking._id })
  const [x, y] = await Promise.all([confirmAfterPayment(payment._id, gp(payment)), confirmAfterPayment(payment._id, gp(payment))])
  assert.equal([x, y].filter((r) => r.duplicate).length, 1)
  assert.equal((await Booking.findById(booking._id)).status, 'Confirmed')
  assert.equal(await Payment.countDocuments({ booking: booking._id, status: 'Paid' }), 1)
})

test('repeating a booking request with the same idempotency key returns the same booking', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner); const user = await makeUser()
  const first = await book(user, villa, 'night', night(130), { idempotencyKey: 'abc-123' })
  const second = await book(user, villa, 'night', night(130), { idempotencyKey: 'abc-123' })
  assert.equal(second.reused, true)
  assert.equal(String(first.booking._id), String(second.booking._id))
  assert.equal(await Booking.countDocuments({ user: user._id }), 1)
})

test('guest cancellation follows the admin refund tiers', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner)
  const early = await makeUser(); const mid = await makeUser(); const late = await makeUser()
  const mk = async (user, inDays) => { const { booking } = await book(user, villa, 'night', night(inDays)); await payFor(booking, user._id); return booking }
  const b100 = await mk(early, 140) // > 72h
  const c = await cancelBooking({ bookingId: b100._id, by: 'guest' })
  assert.equal(c.status, 'Cancelled'); assert.equal(c.cancellation.refundPercent, 100); assert.equal(c.cancellation.refundPaise, b100.pricing.totalPaise)
  assert.equal((await Booking.findById(b100._id)).paymentStatus, 'Refunded')
  assert.equal(await AvailabilityBlock.countDocuments({ booking: b100._id, released: false }), 0)

  const b0 = await mk(late, 150)
  const nowNear = new Date(b0.checkIn.getTime() - 60 * 60 * 1000) // 1h before the stay
  const c0 = await cancelBooking({ bookingId: b0._id, by: 'guest', now: nowNear })
  assert.equal(c0.cancellation.refundPercent, 0)
  assert.equal((await Booking.findById(b0._id)).paymentStatus, 'Paid')

  const b50 = await mk(mid, 160)
  const c50 = await cancelBooking({ bookingId: b50._id, by: 'guest', now: new Date(b50.checkIn.getTime() - 30 * 3600 * 1000) })
  assert.equal(c50.cancellation.refundPercent, 50)
  assert.equal(c50.cancellation.refundPaise, Math.round(b50.pricing.totalPaise / 2))
})

test('owner and admin cancellations: full refund, or the percentage the admin chose', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner); const u = await makeUser()
  const mk = async (inDays) => { const { booking } = await book(u, villa, 'night', night(inDays)); await payFor(booking, u._id); return booking }
  const x = await mk(170)
  const byOwner = await cancelBooking({ bookingId: x._id, by: 'owner', byId: owner._id, now: new Date(x.checkIn.getTime() - 3600 * 1000) })
  assert.equal(byOwner.cancellation.refundPercent, 100)
  const y = await mk(180)
  const byAdmin = await cancelBooking({ bookingId: y._id, by: 'admin', adminPercent: 25 })
  assert.equal(byAdmin.cancellation.refundPaise, Math.round(y.pricing.totalPaise / 4))
  await assert.rejects(cancelBooking({ bookingId: y._id, by: 'guest' }), /no longer be cancelled/)
})

test('cancelling an unpaid hold frees the dates and refunds nothing', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner); const a = await makeUser(); const b = await makeUser()
  const { booking } = await book(a, villa, 'night', night(190))
  const before = gwCalls.refunds.length
  const c = await cancelBooking({ bookingId: booking._id, by: 'guest' })
  assert.equal(c.cancellation.refundPaise, 0)
  assert.equal(gwCalls.refunds.length, before)
  await book(b, villa, 'night', night(190))
})

test('villas stay separate: one owner, two villas, independent calendars', async () => {
  const owner = await makeOwner(); const v1 = await makeVilla(owner); const v2 = await makeVilla(owner); const u = await makeUser()
  await book(u, v1, 'night', night(200))
  await book(u, v2, 'night', night(200))
  assert.equal(await AvailabilityBlock.countDocuments({ villa: v1._id }), 1)
  assert.equal(await AvailabilityBlock.countDocuments({ villa: v2._id }), 1)
})

test('villas that are not approved or whose owner is suspended cannot be booked', async () => {
  const owner = await makeOwner(); const u = await makeUser()
  const draft = await makeVilla(owner, { listingStatus: 'Draft' })
  await assert.rejects(book(u, draft, 'night', night(210)), /not found/)
  const bad = await makeOwner({ status: 'Suspended' }); const v = await makeVilla(bad)
  await assert.rejects(book(u, v, 'night', night(210)), (e) => e.status === 409)
  const maint = await makeVilla(owner)
  await setSettings({ maintenanceMode: true })
  await assert.rejects(book(u, maint, 'night', night(210)), (e) => e.status === 503)
  await setSettings({ maintenanceMode: false })
})

test('a confirmed booking with no check-in becomes a no-show after the grace period', async () => {
  const owner = await makeOwner(); const villa = await makeVilla(owner); const u = await makeUser()
  const { booking } = await book(u, villa, 'night', night(220))
  await payFor(booking, u._id)
  await runBookingJobs(new Date(Date.now() + 224 * 24 * 3600 * 1000))
  assert.equal((await Booking.findById(booking._id)).status, 'No Show')
})

test('status and listingStatus stay in step on a villa', async () => {
  const owner = await makeOwner()
  const v = await makeVilla(owner, { listingStatus: 'Draft' })
  assert.equal(v.status, 'Pending')
  v.listingStatus = 'Approved'; await v.save()
  assert.equal(v.status, 'Active')
  v.status = 'Suspended'; await v.save()
  assert.equal(v.listingStatus, 'Suspended')
  const reloaded = await Hotel.findById(v._id)
  assert.equal(reloaded.status, 'Suspended')
})

test('pay-per-hour villa: free hours in a row are reported and booked hours are respected', async () => {
  const owner = await makeOwner()
  const villa = await makeVilla(owner, { bookingModes: { night: { enabled: true, minNights: 1, maxNights: 30 }, dayUse: { enabled: false, packages: [] }, hourly: { enabled: true, openTime: '09:00', closeTime: '21:00', startStepMinutes: 60, pricePerHourPaise: 20000, minHours: 1, maxHours: 5, durations: [] } } })
  const a = await makeUser(); const b = await makeUser()
  const day = futureDate(300)
  let slots = await daySlots(villa.toObject(), day)
  const at = (t) => slots.hourlyFlex.starts.find((s) => s.time === t)
  assert.equal(at('10:00').maxHours, 5)
  assert.equal(at('19:00').maxHours, 2) // closes at 21:00
  const booked = await book(a, villa, 'hourly', { date: day, startTime: '13:00', durationMinutes: 180 }) // 13:00-16:00
  assert.equal(booked.booking.pricing.roomPaise, 60000)
  slots = await daySlots(villa.toObject(), day)
  assert.equal(at('10:00').maxHours, 3) // only until 13:00
  assert.equal(at('13:00').available, false)
  assert.equal(at('15:00').available, false)
  assert.equal(at('16:00').maxHours, 5)
  await assert.rejects(book(b, villa, 'hourly', { date: day, startTime: '11:00', durationMinutes: 240 }), (e) => e.status === 409)
  await book(b, villa, 'hourly', { date: day, startTime: '10:00', durationMinutes: 180 }) // 10:00-13:00 touches but does not overlap
})

test('same-day booking: tonight can be booked after check-in time, the stay starts from now and ends at the normal check-out', async () => {
  const owner = await makeOwner()
  const villa = await makeVilla(owner)
  const today = utcToZoned(new Date()).date
  const at = (hhmm) => zonedToUtc(today, hhmm)
  const u1 = await makeUser(); const u2 = await makeUser(); const u3 = await makeUser()
  const tonight = { checkIn: today, checkOut: addDays(today, 1) }

  const nights = await nightAvailability(villa.toObject(), [], today, addDays(today, 2), { now: at('15:00') })
  assert.equal(nights[0].available, true)
  assert.equal(nights[0].lateArrival, true)
  assert.equal(new Date(nights[0].arriveFrom).toISOString(), at('15:00').toISOString())

  const { booking } = await createBooking({ user: u1, villaId: villa._id, mode: 'night', selection: tonight, guests: 2, now: at('15:05') })
  assert.equal(booking.checkIn.toISOString(), at('15:15').toISOString()) // from now, to the next quarter hour
  assert.equal(booking.checkOut.toISOString(), zonedToUtc(addDays(today, 1), '11:00').toISOString()) // no extra time
  assert.ok(booking.pricing.roomPaise > 0)

  await assert.rejects(createBooking({ user: u2, villaId: villa._id, mode: 'night', selection: tonight, guests: 2, now: at('15:10') }), (e) => e.status === 409)

  const other = await makeVilla(owner)
  await assert.rejects(createBooking({ user: u3, villaId: other._id, mode: 'night', selection: tonight, guests: 2, now: at('23:50') }), /too late/) // would start after midnight
  const strict = await makeVilla(owner, { allowSameDay: false })
  await assert.rejects(createBooking({ user: u3, villaId: strict._id, mode: 'night', selection: tonight, guests: 2, now: at('15:00') }), /already passed/)
  const early = await createBooking({ user: u3, villaId: other._id, mode: 'night', selection: tonight, guests: 2, now: at('08:00') })
  assert.equal(early.booking.checkIn.toISOString(), at('12:00').toISOString())
})
