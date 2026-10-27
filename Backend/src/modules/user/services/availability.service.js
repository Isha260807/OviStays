import crypto from 'crypto'
import Hotel from '../../../models/Hotel.model.js'
import AvailabilityBlock from '../../../models/AvailabilityBlock.model.js'
import { HttpError } from '../../../utils/httpError.js'
import { DEFAULT_TZ, MINUTE, addDays, eachDate, zonedToUtc } from '../../../utils/time.js'
import { assertBookable, nightStart, nightlyRate } from './pricing.service.js'

// One authoritative calendar per villa. All booking modes read and write the same AvailabilityBlock rows,
// so a day, a night stay, a full day & night, a weekly and a monthly booking can never overlap each other.

const LOCK_MS = 8000
const LOCK_WAIT_MS = 5000
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))


// Runs fn while holding a short per-villa lease, so concurrent bookings on one villa are handled one by one.
// The lease expires by itself, so a crashed server cannot lock a villa forever.
export async function withVillaLock(villaId, fn) {
  const token = crypto.randomUUID()
  const giveUpAt = Date.now() + LOCK_WAIT_MS
  for (;;) {
    const now = new Date()
    const res = await Hotel.updateOne(
      { _id: villaId, $or: [{ calendarLockUntil: null }, { calendarLockUntil: { $lt: now } }] },
      { $set: { calendarLockUntil: new Date(now.getTime() + LOCK_MS), calendarLockToken: token } },
      { timestamps: false }
    )
    if (res.modifiedCount === 1) break
    if (!res.matchedCount && !(await Hotel.exists({ _id: villaId }))) throw new HttpError(404, 'Villa not found')
    if (Date.now() > giveUpAt) throw new HttpError(503, 'The calendar is busy right now. Please try again.')
    await sleep(20 + Math.random() * 30)
  }
  try {
    return await fn()
  } finally {
    await Hotel.updateOne({ _id: villaId, calendarLockToken: token }, { $set: { calendarLockUntil: null, calendarLockToken: '' } }, { timestamps: false })
  }
}

const liveFilter = (now) => ({ released: { $ne: true }, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] })

// Blocks that clash with [startAt, blockedUntil)
export function findConflicts(villaId, startAt, blockedUntil, { now = new Date(), excludeBooking } = {}) {
  return AvailabilityBlock.find({
    villa: villaId,
    ...liveFilter(now),
    startAt: { $lt: blockedUntil },
    blockedUntil: { $gt: startAt },
    ...(excludeBooking ? { booking: { $ne: excludeBooking } } : {}),
  }).lean()
}

// A stay blocks the calendar exactly from its start to its end: the next one can start the moment it ends
export const blockedUntilOf = (villa, endAt) => new Date(endAt.getTime())

const clashes = (blocks, start, until) => blocks.some((b) => b.startAt < until && b.blockedUntil > start)

/**
 * Puts a block on the calendar if the interval is free; throws 409 if not.
 * Must be called inside withVillaLock. The second check after the insert is a safety net:
 * if the lease ever expired mid-way and two writers got in, the later one backs out.
 */
export async function placeBlock(villa, { type, mode, booking, owner, startAt, endAt, expiresAt = null, reason = '' }, { now = new Date() } = {}) {
  const blockedUntil = blockedUntilOf(villa, endAt)
  const existing = await findConflicts(villa._id, startAt, blockedUntil, { now, excludeBooking: booking })
  if (existing.length) throw new HttpError(409, 'That time is no longer available', { conflicts: existing.length })

  const block = await AvailabilityBlock.create({ villa: villa._id, owner, type, mode, booking, startAt, endAt, blockedUntil, expiresAt, reason })
  const raced = await AvailabilityBlock.find({ villa: villa._id, ...liveFilter(now), _id: { $ne: block._id }, startAt: { $lt: blockedUntil }, blockedUntil: { $gt: startAt } }).select('_id').lean()
  if (raced.length) {
    await AvailabilityBlock.deleteOne({ _id: block._id })
    throw new HttpError(409, 'That time is no longer available')
  }
  return block
}

export const releaseBlock = (bookingId) => AvailabilityBlock.updateMany({ booking: bookingId, released: false }, { released: true })
export const confirmBlock = (bookingId) => AvailabilityBlock.updateMany({ booking: bookingId, released: false }, { type: 'booking', expiresAt: null })
export const extendBlock = (bookingId, expiresAt) => AvailabilityBlock.updateMany({ booking: bookingId, released: false }, { expiresAt })

// ---- reading the calendar --------------------------------------------------------------------------

// For each night starting on a date in [from, to): can a guest sleep that night, and at what rate?
export async function nightAvailability(villa, rules, from, to, { now = new Date() } = {}) {
  const tz = villa.timezone || DEFAULT_TZ
  const ci = villa.checkInTime || '12:00'
  const co = villa.checkOutTime || '11:00'
  const rangeStart = zonedToUtc(from, '00:00', tz)
  const rangeEnd = zonedToUtc(addDays(to, 2), '00:00', tz)
  const blocks = await AvailabilityBlock.find({ villa: villa._id, ...liveFilter(now), startAt: { $lt: rangeEnd }, blockedUntil: { $gt: rangeStart } }).lean()

  return eachDate(from, to).map((date) => {
    const begin = nightStart(villa, date, now)
    const start = begin.startAt || zonedToUtc(date, ci, tz)
    const end = zonedToUtc(addDays(date, 1), co, tz)
    let available = Boolean(begin.startAt) && !clashes(blocks, start, blockedUntilOf(villa, end))
    if (available) {
      try { assertBookable(villa, start, now) } catch { available = false }
    }
    return { date, available, pricePaise: nightlyRate(villa, rules, date), ...(begin.late && available ? { lateArrival: true, arriveFrom: start } : {}) }
  })
}

// Whether the Day and the Full day & night bookings are free on one date
export async function daySlots(villa, date, { now = new Date() } = {}) {
  const tz = villa.timezone || DEFAULT_TZ
  const dayStart = zonedToUtc(date, '00:00', tz)
  const dayEnd = zonedToUtc(addDays(date, 1), '00:00', tz)
  const blocks = await AvailabilityBlock.find({
    villa: villa._id, ...liveFilter(now),
    startAt: { $lt: new Date(dayEnd.getTime() + 24 * 60 * MINUTE) },
    blockedUntil: { $gt: new Date(dayStart.getTime() - 24 * 60 * MINUTE) },
  }).lean()

  const free = (start, end) => {
    if (clashes(blocks, start, blockedUntilOf(villa, end))) return false
    try { assertBookable(villa, start, now) } catch { return false }
    return true
  }

  const modes = villa.bookingModes || {}
  const out = { date, day: null, fullDayNight: null }

  if (modes.day?.enabled) {
    const d = modes.day
    out.day = { startTime: d.startTime, endTime: d.endTime, pricePaise: d.pricePaise, maxGuests: d.maxGuests, available: free(zonedToUtc(date, d.startTime, tz), zonedToUtc(date, d.endTime, tz)) }
  }
  if (modes.fullDayNight?.enabled) {
    const f = modes.fullDayNight
    out.fullDayNight = { startTime: f.startTime, endTime: f.endTime, pricePaise: f.pricePaise, maxGuests: f.maxGuests, available: free(zonedToUtc(date, f.startTime, tz), zonedToUtc(addDays(date, 1), f.endTime, tz)) }
  }
  return out
}
