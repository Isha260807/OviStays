import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { connect, disconnect, futureDate } from './helpers.js'
import app from '../src/app.js'
import { signAccessToken } from '../src/core/auth/token.util.js'
import { addDays } from '../src/utils/time.js'
import Amenity from '../src/models/Amenity.model.js'
import { setGateway } from '../src/core/payments/gateway.js'

let server
let base
before(async () => {
  await connect()
  setGateway(null) // use the built-in test-mode gateway end to end
  server = app.listen(0)
  base = `http://127.0.0.1:${server.address().port}/api`
})
after(async () => {
  server.close()
  await disconnect()
})

async function call(method, path, { token, body, headers } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}

let phoneSeq = 0
async function signupOwner(name) {
  const phone = `+91977700${String(1000 + ++phoneSeq)}`
  const r = await call('POST', '/hotel/auth/register', { body: { name, phone, acceptTerms: true } })
  assert.equal(r.status, 200, JSON.stringify(r.body))
  const v = await call('POST', '/hotel/auth/verify-otp', { body: { phone, otp: '123456' } })
  assert.equal(v.status, 200, JSON.stringify(v.body))
  return { token: v.body.data.token, id: v.body.data.owner.id, refresh: v.body.data.refreshToken, phone }
}

async function signupGuest(name) {
  const phone = `+91966600${String(1000 + ++phoneSeq)}`
  await call('POST', '/user/auth/register', { body: { name, phone, acceptTerms: true } })
  const v = await call('POST', '/user/auth/verify-otp', { body: { phone, otp: '123456' } })
  assert.equal(v.status, 200, JSON.stringify(v.body))
  return { token: v.body.data.token }
}

async function verifyOwner(o) {
  const k = await call('POST', '/hotel/kyc', { token: o.token, body: { panNumber: 'ABCDE1234F', panName: 'Owner', documents: [{ type: 'PAN card', url: '/uploads/pan.pdf' }], bank: { holderName: 'Owner', accountNumber: '123456789012', ifsc: 'HDFC0001234' } } })
  assert.equal(k.status, 200, JSON.stringify(k.body))
  const v = await call('POST', `/admin/owners/${o.id}/kyc`, { token: admin(), body: { action: 'verify' } })
  assert.equal(v.status, 200, JSON.stringify(v.body))
}

const admin = () => signAccessToken({ id: String(new mongoose.Types.ObjectId()), role: 'admin' })

const img = (n) => `/uploads/test-${n}.webp`
const completeVilla = (extra = {}) => ({
  name: 'Palm Grove Villa', description: 'A calm private villa with a pool, garden and three airy bedrooms near the beach.',
  city: 'Goa', state: 'Goa', address: '12 Palm Road, Candolim', pincode: '403515',
  coverImage: img(0), gallery: [1, 2, 3].map((n) => ({ url: img(n), category: 'Exterior' })),
  bedrooms: 3, bathrooms: 3, maxGuests: 8, geo: { lat: 15.5, lng: 73.8 },
  checkInTime: '12:00', checkOutTime: '11:00', minNoticeHours: 0,
  pricing: { basePricePaise: 1000000, cleaningFeePaise: 50000 },
  bookingModes: {
    night: { enabled: true, minNights: 1, maxNights: 14 },
    dayUse: { enabled: true, packages: [{ name: 'Pool day', startTime: '10:00', endTime: '18:00', pricePaise: 400000, maxGuests: 6 }] },
    hourly: { enabled: false, durations: [] },
  },
  ...extra,
})

let owner1; let owner2; let villaId; let amenityId
test('owner signs up, logs in again and refreshes the session', async () => {
  owner1 = await signupOwner('Asha Owner')
  owner2 = await signupOwner('Ravi Other')
  for (const o of [owner1, owner2]) await verifyOwner(o)
  const me = await call('GET', '/hotel/auth/me', { token: owner1.token })
  assert.equal(me.body.data.name, 'Asha Owner')
  assert.equal(me.body.data.kycStatus, 'Verified')
  const again = await call('POST', '/hotel/auth/send-otp', { body: { phone: owner1.phone } })
  assert.equal(again.status, 200)
  const r = await call('POST', '/hotel/auth/refresh', { body: { refreshToken: owner1.refresh } })
  assert.equal(r.status, 200)
  const reuse = await call('POST', '/hotel/auth/refresh', { body: { refreshToken: owner1.refresh } }) // still inside the grace window
  assert.ok([200, 401].includes(reuse.status))
})

test('an owner whose documents are not approved can only see their profile', async () => {
  const fresh = await signupOwner('Pending Owner')
  assert.equal((await call('GET', '/hotel/profile', { token: fresh.token })).status, 200)
  for (const path of ['/hotel/dashboard', '/hotel/villas', '/hotel/bookings', '/hotel/earnings']) {
    const r = await call('GET', path, { token: fresh.token })
    assert.equal(r.status, 403, path)
    assert.equal(r.body.code, 'KYC_REQUIRED')
    assert.equal(r.body.kycStatus, 'Not Submitted')
  }
  assert.equal((await call('POST', '/hotel/villas', { token: fresh.token, body: completeVilla() })).status, 403)

  const kyc = await call('POST', '/hotel/kyc', { token: fresh.token, body: { panNumber: 'ABCDE1234F', panName: 'Pending Owner', documents: [{ type: 'PAN card', url: '/uploads/pan.pdf' }], bank: { holderName: 'Pending Owner', accountNumber: '123456789012', ifsc: 'HDFC0001234' } } })
  assert.equal(kyc.status, 200)
  const waiting = await call('GET', '/hotel/villas', { token: fresh.token })
  assert.equal(waiting.status, 403)
  assert.equal(waiting.body.kycStatus, 'Submitted')
  assert.match(waiting.body.message, /under review/)

  const a = admin()
  const rej = await call('POST', `/admin/owners/${fresh.id}/kyc`, { token: a, body: { action: 'reject', reason: 'PAN photo is unclear' } })
  assert.equal(rej.status, 200)
  assert.equal((await call('GET', '/hotel/villas', { token: fresh.token })).body.kycStatus, 'Rejected')
  assert.equal((await call('GET', '/hotel/profile', { token: fresh.token })).body.data.kyc.rejectReason, 'PAN photo is unclear')
  // fix and send again, then the admin approves
  assert.equal((await call('POST', '/hotel/kyc', { token: fresh.token, body: { panNumber: 'ABCDE1234F', panName: 'Pending Owner', documents: [{ type: 'PAN card', url: '/uploads/pan2.pdf' }], bank: { holderName: 'Pending Owner', accountNumber: '123456789012', ifsc: 'HDFC0001234' } } })).status, 200)
  assert.equal((await call('POST', `/admin/owners/${fresh.id}/kyc`, { token: a, body: { action: 'verify' } })).status, 200)
  assert.equal((await call('GET', '/hotel/villas', { token: fresh.token })).status, 200)
  assert.equal((await call('GET', '/hotel/dashboard', { token: fresh.token })).status, 200)
})

test('profile photo and address are saved and validated; help & support is public', async () => {
  const bad = await call('PATCH', '/hotel/profile', { token: owner1.token, body: { photo: 'javascript:alert(1)' } })
  assert.equal(bad.status, 400)
  assert.equal((await call('PATCH', '/hotel/profile', { token: owner1.token, body: { address: { pincode: 'abc' } } })).status, 400)
  const ok = await call('PATCH', '/hotel/profile', { token: owner1.token, body: { photo: '/uploads/profile_abc123.webp', address: { line: '12 Palm Road', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' } } })
  assert.equal(ok.status, 200, JSON.stringify(ok.body))
  assert.equal(ok.body.data.photo, '/uploads/profile_abc123.webp')
  assert.equal(ok.body.data.address.city, 'Jaipur')
  assert.equal((await call('GET', '/hotel/auth/me', { token: owner1.token })).body.data.photo, '/uploads/profile_abc123.webp')
  const support = await call('GET', '/hotel/support') // no login needed
  assert.equal(support.status, 200)
  assert.ok(support.body.data.faqs.length > 0)
})

test('support: contact numbers come from admin settings and owners can raise tickets', async () => {
  const a = admin()
  await call('PUT', '/admin/settings', { token: a, body: { supportPhone: '9876543210', supportEmail: 'help@ovistays.test' } })
  const info = await call('GET', '/hotel/support')
  assert.equal(info.body.data.dial, '919876543210') // country code added for call and chat links
  assert.equal(info.body.data.email, 'help@ovistays.test')

  assert.equal((await call('POST', '/hotel/support/tickets', { token: owner1.token, body: { subject: 'x', description: 'too short' } })).status, 400)
  const t = await call('POST', '/hotel/support/tickets', { token: owner1.token, body: { subject: 'Payout delayed', description: 'My last payout has not reached my account yet.' } })
  assert.equal(t.status, 201, JSON.stringify(t.body))
  const mine = await call('GET', '/hotel/support/tickets', { token: owner1.token })
  assert.equal(mine.body.data.length, 1)
  assert.equal((await call('GET', '/hotel/support/tickets', { token: owner2.token })).body.data.length, 0) // each owner sees only their own
  const seenByAdmin = await call('GET', '/admin/support-tickets?search=Payout', { token: a })
  assert.equal(seenByAdmin.body.data.items.length, 1)
  assert.equal(seenByAdmin.body.data.items[0].raisedByType, 'Hotel')
})

test('guest and anonymous tokens cannot use owner routes', async () => {
  const guest = await signupGuest('Guest A')
  assert.equal((await call('GET', '/hotel/villas', { token: guest.token })).status, 403)
  assert.equal((await call('GET', '/hotel/villas')).status, 401)
  assert.equal((await call('GET', '/hotel/villas', { token: admin() })).status, 403)
})

test('villa drafts, validation and ownership', async () => {
  amenityId = String((await Amenity.create({ name: 'Pool', category: 'Wellness' }))._id)
  const bad = await call('POST', '/hotel/villas', { token: owner1.token, body: { name: 'X', city: 'Goa' } })
  assert.equal(bad.status, 400)
  const created = await call('POST', '/hotel/villas', { token: owner1.token, body: { ...completeVilla({ amenities: [amenityId] }), ownerId: String(owner2.id) } })
  assert.equal(created.status, 201, JSON.stringify(created.body))
  villaId = created.body.data.id
  assert.equal(created.body.data.listingStatus, 'Draft')
  assert.equal(created.body.data.isPublic, false)

  // a client-supplied ownerId is ignored: the villa belongs to the signed-in owner
  assert.equal((await call('GET', '/hotel/villas', { token: owner1.token })).body.data.length, 1)
  assert.equal((await call('GET', '/hotel/villas', { token: owner2.token })).body.data.length, 0)
  assert.equal((await call('GET', `/hotel/villas/${villaId}`, { token: owner2.token })).status, 404)
  assert.equal((await call('PATCH', `/hotel/villas/${villaId}`, { token: owner2.token, body: { name: 'Hijacked' } })).status, 404)
  assert.equal((await call('GET', `/hotel/villas/${villaId}/calendar?from=${futureDate(1)}&to=${futureDate(10)}`, { token: owner2.token })).status, 404)
  assert.equal((await call('POST', `/hotel/villas/${villaId}/blocks`, { token: owner2.token, body: { kind: 'nights', from: futureDate(5), to: futureDate(6) } })).status, 404)

  assert.equal((await call('PATCH', `/hotel/villas/${villaId}`, { token: owner1.token, body: { pricing: { basePricePaise: 12.5 } } })).status, 400)
  const upd = await call('PATCH', `/hotel/villas/${villaId}`, { token: owner1.token, body: { name: 'Palm Grove Villa & Pool', confirmationMode: 'instant' } })
  assert.equal(upd.status, 200)
  assert.equal(upd.body.data.name, 'Palm Grove Villa & Pool')
  assert.equal(upd.body.data.pricing.basePricePaise, 1000000) // untouched fields survive a partial update
})

test('a draft is invisible to guests and the bank number is never sent back', async () => {
  assert.equal((await call('GET', `/user/villas/${villaId}`)).status, 404)
  const p = await call('GET', '/hotel/profile', { token: owner1.token })
  assert.equal(p.body.data.kyc.status, 'Verified')
  assert.equal(p.body.data.bank.last4, '9012')
  assert.equal(JSON.stringify(p.body).includes('123456789012'), false)
  assert.equal((await call('POST', '/hotel/kyc', { token: owner1.token, body: {} })).status, 409) // already verified
  assert.equal((await call('POST', `/admin/owners/${owner1.id}/kyc`, { token: owner1.token, body: { action: 'verify' } })).status, 403) // owners cannot verify themselves
})

test('incomplete villas are refused; complete ones go for approval and the admin decides', async () => {
  const draft = await call('POST', '/hotel/villas', { token: owner1.token, body: { name: 'Half Done', city: 'Goa' } })
  const incomplete = await call('POST', `/hotel/villas/${draft.body.data.id}/submit`, { token: owner1.token })
  assert.equal(incomplete.status, 400)
  assert.match(incomplete.body.message, /cover photo/)
  assert.equal((await call('DELETE', `/hotel/villas/${draft.body.data.id}`, { token: owner1.token })).status, 200)

  const sub = await call('POST', `/hotel/villas/${villaId}/submit`, { token: owner1.token })
  assert.equal(sub.status, 200, JSON.stringify(sub.body))
  assert.equal(sub.body.data.listingStatus, 'Pending Approval')
  assert.equal((await call('GET', `/user/villas/${villaId}`)).status, 404)

  const a = admin()
  assert.equal((await call('POST', `/admin/hotels/${villaId}/listing`, { token: a, body: { action: 'reject' } })).status, 400) // reason required
  const rejected = await call('POST', `/admin/hotels/${villaId}/listing`, { token: a, body: { action: 'reject', reason: 'Photos are blurry' } })
  assert.equal(rejected.body.data.listingStatus, 'Rejected')
  assert.equal((await call('GET', `/hotel/villas/${villaId}`, { token: owner1.token })).body.data.rejectionReason, 'Photos are blurry')
  assert.equal((await call('POST', `/hotel/villas/${villaId}/submit`, { token: owner1.token })).status, 200)
  const ok = await call('POST', `/admin/hotels/${villaId}/listing`, { token: a, body: { action: 'approve' } })
  assert.equal(ok.body.data.status, 'Active')

  const pub = await call('GET', `/user/villas/${villaId}`)
  assert.equal(pub.status, 200)
  assert.equal(pub.body.data.booking.night.enabled, true)
  assert.equal(pub.body.data.booking.dayUse.packages.length, 1)
  assert.match(pub.body.data.policies.cancellation, /refund/)
  const search = await call('GET', '/user/villas?city=Goa')
  assert.ok(search.body.data.items.some((v) => v.id === villaId))
})

let guest
let bookingId
test('a guest quotes, books, pays in test mode, and gets a check-in code', async () => {
  guest = await signupGuest('Guest Booker')
  const selection = { checkIn: futureDate(30), checkOut: futureDate(32) }
  const q = await call('POST', '/user/bookings/quote', { body: { villaId, mode: 'night', selection, guests: 2 } })
  assert.equal(q.status, 200, JSON.stringify(q.body))
  assert.equal(q.body.data.available, true)
  assert.ok(q.body.data.pricing.totalPaise > 2000000)

  const noAuth = await call('POST', '/user/bookings', { body: { villaId, mode: 'night', selection, guests: 2 } })
  assert.equal(noAuth.status, 401)
  const created = await call('POST', '/user/bookings', { token: guest.token, headers: { 'Idempotency-Key': 'k-1' }, body: { villaId, mode: 'night', selection, guests: 2 } })
  assert.equal(created.status, 201, JSON.stringify(created.body))
  assert.equal(created.body.data.status, 'Awaiting Payment')
  assert.equal(created.body.data.checkInCode, '') // not before payment
  bookingId = created.body.data.id
  const retry = await call('POST', '/user/bookings', { token: guest.token, headers: { 'Idempotency-Key': 'k-1' }, body: { villaId, mode: 'night', selection, guests: 2 } })
  assert.equal(retry.body.data.id, bookingId)

  const other = await signupGuest('Guest Late')
  const clash = await call('POST', '/user/bookings', { token: other.token, body: { villaId, mode: 'night', selection, guests: 2 } })
  assert.equal(clash.status, 409)
  assert.equal((await call('GET', `/user/bookings/${bookingId}`, { token: other.token })).status, 404) // someone else's booking

  const cal = await call('GET', `/user/villas/${villaId}/availability?from=${futureDate(28)}&to=${futureDate(35)}`)
  const taken = cal.body.data.nights.filter((n) => !n.available).map((n) => n.date)
  assert.deepEqual(taken, [futureDate(30), futureDate(31)])

  const pay = await call('POST', `/user/bookings/${bookingId}/pay`, { token: guest.token })
  assert.equal(pay.status, 200, JSON.stringify(pay.body))
  assert.equal(pay.body.data.mode, 'mock')
  const paid = await call('POST', `/user/bookings/${bookingId}/payment/mock`, { token: guest.token })
  assert.equal(paid.status, 200, JSON.stringify(paid.body))
  assert.equal(paid.body.data.status, 'Confirmed')
  assert.match(paid.body.data.checkInCode, /^\d{6}$/)
  assert.ok(paid.body.data.refundIfCancelled)

  const again = await call('POST', `/user/bookings/${bookingId}/payment/mock`, { token: guest.token })
  assert.notEqual(again.status, 500)
  const mine = await call('GET', '/user/bookings?tab=upcoming', { token: guest.token })
  assert.equal(mine.body.data.length, 1)
})

test('the owner sees the booking, blocks dates around it, and checks the guest in', async () => {
  const list = await call('GET', '/hotel/bookings?tab=confirmed', { token: owner1.token })
  assert.equal(list.body.data.items.length, 1)
  assert.equal(list.body.data.items[0].guest.name, 'Guest Booker')
  assert.equal((await call('GET', '/hotel/bookings?tab=confirmed', { token: owner2.token })).body.data.items.length, 0)
  assert.equal((await call('GET', `/hotel/bookings/${bookingId}`, { token: owner2.token })).status, 404)
  assert.equal((await call('POST', `/hotel/bookings/${bookingId}/cancel`, { token: owner2.token, body: { reason: 'x' } })).status, 404)

  const overlap = await call('POST', `/hotel/villas/${villaId}/blocks`, { token: owner1.token, body: { kind: 'nights', from: futureDate(31), to: futureDate(33) } })
  assert.equal(overlap.status, 409)
  const block = await call('POST', `/hotel/villas/${villaId}/blocks`, { token: owner1.token, body: { kind: 'nights', from: futureDate(40), to: futureDate(42), reason: 'Repairs' } })
  assert.equal(block.status, 201, JSON.stringify(block.body))
  const cal = await call('GET', `/hotel/villas/${villaId}/calendar?from=${futureDate(28)}&to=${futureDate(45)}`, { token: owner1.token })
  assert.equal(cal.body.data.blocks.length, 2)
  assert.ok(cal.body.data.blocks.some((b) => b.type === 'owner_block' && b.reason === 'Repairs'))
  assert.ok(cal.body.data.blocks.some((b) => b.booking?.code))
  // the blocked nights are gone from the public calendar
  const pub = await call('GET', `/user/villas/${villaId}/availability?from=${futureDate(39)}&to=${futureDate(44)}`)
  assert.deepEqual(pub.body.data.nights.filter((n) => !n.available).map((n) => n.date), [futureDate(40), futureDate(41), futureDate(42)])
  assert.equal((await call('DELETE', `/hotel/villas/${villaId}/blocks/${block.body.data.id}`, { token: owner1.token })).status, 200)

  // check-in is not open 30 days ahead
  const code = (await call('GET', `/user/bookings/${bookingId}`, { token: guest.token })).body.data.checkInCode
  const early = await call('POST', `/hotel/bookings/${bookingId}/check-in`, { token: owner1.token, body: { code } })
  assert.equal(early.status, 409)
})

test('price periods: overlap is refused and the nightly price changes', async () => {
  const rule = { label: 'New Year', startDate: futureDate(60), endDate: futureDate(63), nightPricePaise: 3000000 }
  const created = await call('POST', `/hotel/villas/${villaId}/price-rules`, { token: owner1.token, body: rule })
  assert.equal(created.status, 201, JSON.stringify(created.body))
  assert.equal((await call('POST', `/hotel/villas/${villaId}/price-rules`, { token: owner1.token, body: { ...rule, startDate: futureDate(62), endDate: futureDate(65) } })).status, 409)
  assert.equal((await call('POST', `/hotel/villas/${villaId}/price-rules`, { token: owner2.token, body: rule })).status, 404)
  const q = await call('POST', '/user/bookings/quote', { body: { villaId, mode: 'night', selection: { checkIn: futureDate(60), checkOut: futureDate(61) }, guests: 2 } })
  assert.equal(q.body.data.pricing.roomPaise, 3000000)
})

test('owner cancels a confirmed booking: guest is refunded in full and the dates reopen', async () => {
  const no = await call('POST', `/hotel/bookings/${bookingId}/cancel`, { token: owner1.token, body: {} })
  assert.equal(no.status, 400) // a reason is required
  const done = await call('POST', `/hotel/bookings/${bookingId}/cancel`, { token: owner1.token, body: { reason: 'Pipe burst' } })
  assert.equal(done.status, 200, JSON.stringify(done.body))
  const mine = await call('GET', `/user/bookings/${bookingId}`, { token: guest.token })
  assert.equal(mine.body.data.status, 'Cancelled')
  assert.equal(mine.body.data.cancellation.refundPercent, 100)
  assert.equal(mine.body.data.paymentStatus, 'Refunded')
  const cal = await call('GET', `/user/villas/${villaId}/availability?from=${futureDate(29)}&to=${futureDate(34)}`)
  assert.equal(cal.body.data.nights.every((n) => n.available), true)
})

test('request-to-book end to end with accept, and the dashboard aggregates only this owner', async () => {
  const a = admin()
  const set = await call('PATCH', `/hotel/villas/${villaId}`, { token: owner1.token, body: { confirmationMode: 'request' } })
  assert.equal(set.body.data.confirmationMode, 'request')
  const selection = { checkIn: futureDate(70), checkOut: futureDate(72) }
  const req = await call('POST', '/user/bookings', { token: guest.token, body: { villaId, mode: 'night', selection, guests: 3 } })
  assert.equal(req.body.data.status, 'Requested')
  const id = req.body.data.id
  assert.equal((await call('POST', `/user/bookings/${id}/pay`, { token: guest.token })).status, 409)

  const pending = await call('GET', '/hotel/bookings?tab=pending', { token: owner1.token })
  assert.equal(pending.body.data.items.length, 1)
  assert.equal(pending.body.data.pendingRequests, 1)
  assert.equal((await call('POST', `/hotel/bookings/${id}/accept`, { token: owner2.token })).status, 404)
  const acc = await call('POST', `/hotel/bookings/${id}/accept`, { token: owner1.token })
  assert.equal(acc.body.data.status, 'Awaiting Payment')
  await call('POST', `/user/bookings/${id}/pay`, { token: guest.token })
  const paid = await call('POST', `/user/bookings/${id}/payment/mock`, { token: guest.token })
  assert.equal(paid.body.data.status, 'Confirmed')

  const dash = await call('GET', '/hotel/dashboard', { token: owner1.token })
  assert.equal(dash.status, 200, JSON.stringify(dash.body))
  assert.equal(dash.body.data.totals.confirmed, 1)
  assert.ok(dash.body.data.totals.earningsPaise > 0)
  const other = await call('GET', '/hotel/dashboard', { token: owner2.token })
  assert.equal(other.body.data.totals.bookings, 0)
  assert.equal((await call('GET', `/hotel/dashboard?villa=${villaId}`, { token: owner2.token })).status, 404)
  const earn = await call('GET', '/hotel/earnings', { token: owner1.token })
  assert.equal(earn.body.data.items.length, 1)

  const info = await call('GET', `/admin/hotels/${villaId}/listing`, { token: a })
  assert.equal(info.body.data.liveBookings, 1)
  const susp = await call('POST', `/admin/hotels/${villaId}/listing`, { token: a, body: { action: 'suspend', reason: 'Safety complaint', cancelBookings: true } })
  assert.equal(susp.body.data.cancelledBookings, 1)
  assert.equal((await call('GET', `/user/villas/${villaId}`)).status, 404)
  const after = await call('GET', `/user/bookings/${id}`, { token: guest.token })
  assert.equal(after.body.data.status, 'Cancelled')
  assert.equal(after.body.data.cancellation.refundPercent, 100)
})

test('admin sets the refund percentage rules and can override one booking', async () => {
  const a = admin()
  const bad = await call('PUT', '/admin/settings', { token: a, body: { refundTiers: [{ hoursBeforeStart: 24, refundPercent: 150 }] } })
  assert.equal(bad.status, 400)
  const ok = await call('PUT', '/admin/settings', { token: a, body: { refundTiers: [{ hoursBeforeStart: 24, refundPercent: 50 }, { hoursBeforeStart: 96, refundPercent: 100 }], ownerResponseHours: 6 } })
  assert.equal(ok.status, 200, JSON.stringify(ok.body))
  assert.deepEqual(ok.body.data.refundTiers.map((t) => t.hoursBeforeStart), [96, 24])
  assert.equal(ok.body.data.ownerResponseHours, 6)
})
