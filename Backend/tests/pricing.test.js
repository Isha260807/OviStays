import test from 'node:test'
import assert from 'node:assert/strict'
import { computeQuote, nightlyRate, startingPricePaise } from '../src/modules/user/services/pricing.service.js'
import { computeRefund, refundPercentFor } from '../src/modules/user/services/refund.policy.js'
import { percentOf } from '../src/utils/money.js'
import { zonedToUtc, utcToZoned, addDays, diffDays } from '../src/utils/time.js'

const villa = {
  checkInTime: '12:00', checkOutTime: '11:00', timezone: 'Asia/Kolkata', maxGuests: 6, minNoticeHours: 0, maxAdvanceDays: 3650,
  pricing: { basePricePaise: 1000000, weekendPricePaise: 1500000, weeklyDiscountPct: 10, monthlyDiscountPct: 20, cleaningFeePaise: 50000 },
  bookingModes: {
    night: { enabled: true, minNights: 2, maxNights: 40 },
    dayUse: { enabled: true, packages: [{ _id: 'p1', name: 'Pool day', startTime: '10:00', endTime: '18:00', pricePaise: 400000, maxGuests: 4 }] },
    hourly: { enabled: true, openTime: '09:00', closeTime: '21:00', startStepMinutes: 60, durations: [{ minutes: 120, pricePaise: 200000 }] },
  },
}
const settings = { stayGstRate: 12, commissionRate: 10, platformFee: 0, gstRate: 18 }
const now = new Date('2030-01-01T00:00:00Z')

test('time zone helpers round-trip and respect IST', () => {
  assert.equal(zonedToUtc('2030-03-10', '12:00').toISOString(), '2030-03-10T06:30:00.000Z')
  assert.deepEqual(utcToZoned(new Date('2030-03-10T06:30:00Z')), { date: '2030-03-10', time: '12:00', weekday: 0 })
  assert.equal(addDays('2030-02-28', 1), '2030-03-01')
  assert.equal(diffDays('2030-03-01', '2030-03-08'), 7)
})

test('percentOf rounds to whole paise', () => {
  assert.equal(percentOf(333, 12.5), 42)
  assert.equal(percentOf(1000000, 12), 120000)
})

test('weekend nights cost more and price rules win', () => {
  // 2030-01-04 is a Friday, 2030-01-02 a Wednesday
  assert.equal(nightlyRate(villa, [], '2030-01-02'), 1000000)
  assert.equal(nightlyRate(villa, [], '2030-01-04'), 1500000)
  assert.equal(nightlyRate(villa, [{ startDate: '2030-01-01', endDate: '2030-01-05', nightPricePaise: 2000000 }], '2030-01-02'), 2000000)
  assert.equal(nightlyRate(villa, [{ startDate: '2030-01-01', endDate: '2030-01-05', adjustPct: 10 }], '2030-01-02'), 1100000)
})

test('night quote: rate x nights + cleaning + GST, all whole paise', () => {
  const q = computeQuote({ villa, mode: 'night', selection: { checkIn: '2030-01-02', checkOut: '2030-01-04' }, guests: 2, settings, now })
  // Wed + Thu nights at 10,000 each
  assert.equal(q.pricing.roomPaise, 2000000)
  assert.equal(q.pricing.cleaningFeePaise, 50000)
  assert.equal(q.pricing.taxPaise, percentOf(2050000, 12))
  assert.equal(q.pricing.totalPaise, 2050000 + q.pricing.taxPaise)
  assert.ok(Number.isInteger(q.pricing.totalPaise) && Number.isInteger(q.pricing.ownerPayoutPaise))
  assert.ok(q.pricing.ownerPayoutPaise < q.pricing.totalPaise)
  assert.equal(q.nights, undefined)
  assert.equal(q.pricing.nights, 2)
})

test('weekly stays get the discount', () => {
  const q = computeQuote({ villa, mode: 'night', selection: { checkIn: '2030-01-02', checkOut: '2030-01-10' }, guests: 2, settings, now })
  assert.equal(q.pricing.discountPaise, percentOf(q.pricing.roomPaise, 10))
})

test('stay length limits and guest limits are enforced', () => {
  assert.throws(() => computeQuote({ villa, mode: 'night', selection: { checkIn: '2030-01-02', checkOut: '2030-01-03' }, guests: 2, settings, now }), /Minimum stay/)
  assert.throws(() => computeQuote({ villa, mode: 'night', selection: { checkIn: '2030-01-02', checkOut: '2030-03-20' }, guests: 2, settings, now }), /Maximum stay/)
  assert.throws(() => computeQuote({ villa, mode: 'night', selection: { checkIn: '2030-01-02', checkOut: '2030-01-04' }, guests: 7, settings, now }), /up to 6 guests/)
  assert.throws(() => computeQuote({ villa, mode: 'night', selection: { checkIn: '2030-01-04', checkOut: '2030-01-02' }, guests: 2, settings, now }), /after check-in/)
})

test('a mode the villa does not offer is refused', () => {
  const nightOnly = { ...villa, bookingModes: { ...villa.bookingModes, dayUse: { enabled: false, packages: [] } } }
  assert.throws(() => computeQuote({ villa: nightOnly, mode: 'dayUse', selection: { date: '2030-01-02', packageId: 'p1' }, guests: 2, settings, now }), /does not offer/)
})

test('day-use and hourly quotes use their own prices and windows', () => {
  const d = computeQuote({ villa, mode: 'dayUse', selection: { date: '2030-01-02', packageId: 'p1' }, guests: 3, settings, now })
  assert.equal(d.pricing.roomPaise, 400000)
  assert.equal(d.startAt.toISOString(), '2030-01-02T04:30:00.000Z')
  assert.equal(d.endAt.toISOString(), '2030-01-02T12:30:00.000Z')
  assert.throws(() => computeQuote({ villa, mode: 'dayUse', selection: { date: '2030-01-02', packageId: 'p1' }, guests: 5, settings, now }), /up to 4 guests/)

  const h = computeQuote({ villa, mode: 'hourly', selection: { date: '2030-01-02', startTime: '10:00', durationMinutes: 120 }, guests: 2, settings, now })
  assert.equal(h.endAt - h.startAt, 120 * 60 * 1000)
  assert.throws(() => computeQuote({ villa, mode: 'hourly', selection: { date: '2030-01-02', startTime: '20:00', durationMinutes: 120 }, guests: 2, settings, now }), /Slots run between/)
  assert.throws(() => computeQuote({ villa, mode: 'hourly', selection: { date: '2030-01-02', startTime: '10:30', durationMinutes: 120 }, guests: 2, settings, now }), /listed start times/)
})

test('past start times and too-far-ahead dates are refused', () => {
  assert.throws(() => computeQuote({ villa, mode: 'night', selection: { checkIn: '2029-12-29', checkOut: '2029-12-31' }, guests: 2, settings, now: new Date('2030-01-01T00:00:00Z') }), /already passed|notice/)
})

test('starting price is the cheapest enabled mode', () => {
  assert.equal(startingPricePaise(villa), 200000)
})

test('refund tiers: the largest matching tier wins, later cancels get nothing', () => {
  const tiers = [{ hoursBeforeStart: 24, refundPercent: 50 }, { hoursBeforeStart: 72, refundPercent: 100 }]
  const start = new Date('2030-01-10T12:00:00Z')
  const at = (hoursBefore) => new Date(start.getTime() - hoursBefore * 3600 * 1000)
  assert.equal(refundPercentFor(tiers, start, at(100)).percent, 100)
  assert.equal(refundPercentFor(tiers, start, at(72)).percent, 100)
  assert.equal(refundPercentFor(tiers, start, at(30)).percent, 50)
  assert.equal(refundPercentFor(tiers, start, at(2)).percent, 0)
})

test('who cancels decides the refund', () => {
  const tiers = [{ hoursBeforeStart: 72, refundPercent: 100 }]
  const start = new Date('2030-01-10T12:00:00Z')
  const now = new Date('2030-01-09T12:00:00Z')
  assert.equal(computeRefund({ by: 'guest', paidPaise: 100000, startAt: start, tiers, now }).refundPaise, 0)
  assert.equal(computeRefund({ by: 'owner', paidPaise: 100000, startAt: start, tiers, now }).refundPaise, 100000)
  assert.equal(computeRefund({ by: 'admin', paidPaise: 100000, startAt: start, tiers, now, adminPercent: 40 }).refundPaise, 40000)
  assert.equal(computeRefund({ by: 'guest', paidPaise: 100000, startAt: new Date('2030-01-08T00:00:00Z'), tiers, now }).refundPaise, 0)
  assert.equal(computeRefund({ by: 'guest', paidPaise: 0, startAt: start, tiers, now }).refundPaise, 0)
})

test('pay-per-hour: the guest picks the hours and the price is hours x rate', () => {
  const v = { ...villa, bookingModes: { ...villa.bookingModes, hourly: { enabled: true, openTime: '09:00', closeTime: '21:00', startStepMinutes: 30, pricePerHourPaise: 20000, minHours: 1, maxHours: 4, durations: [] } } }
  const q = (hours, start = '10:00') => computeQuote({ villa: v, mode: 'hourly', selection: { date: '2030-01-02', startTime: start, durationMinutes: hours * 60 }, guests: 2, settings: { ...settings, stayGstRate: 0 }, now })
  assert.equal(q(1).pricing.roomPaise, 20000)
  assert.equal(q(3).pricing.roomPaise, 60000)
  assert.equal(q(4).endAt - q(4).startAt, 4 * 3600 * 1000)
  assert.throws(() => q(5), /between 1 and 4 hours/)
  assert.throws(() => computeQuote({ villa: v, mode: 'hourly', selection: { date: '2030-01-02', startTime: '10:00', durationMinutes: 90 }, guests: 2, settings, now }), /between 1 and 4 hours/)
  assert.throws(() => q(3, '19:00'), /Slots run between/) // would end after closing
  assert.equal(startingPricePaise({ ...v, bookingModes: { ...v.bookingModes, dayUse: { enabled: false, packages: [] } }, pricing: {} }), 20000)
})
