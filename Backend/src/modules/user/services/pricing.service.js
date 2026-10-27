import { HttpError, badRequest } from '../../../utils/httpError.js'
import { percentOf, formatInr } from '../../../utils/money.js'
import { DEFAULT_TZ, addDays, diffDays, eachDate, fromMinutes, isDateStr, isTimeStr, toMinutes, utcToZoned, weekdayOf, zonedToUtc } from '../../../utils/time.js'

// Turns a guest's selection (mode + dates / slot) into the exact interval and price. Pure functions:
// the villa, its price rules and the settings are passed in, so the result is the same everywhere
// (quote, hold, payment order) and easy to test. The client never supplies a price.

const MODES = ['night', 'dayUse', 'hourly']
export const isMode = (m) => MODES.includes(m)

const enabled = (villa, mode) => Boolean(villa.bookingModes?.[mode]?.enabled)

// Price rules are { startDate, endDate (inclusive), nightPricePaise?, adjustPct? }; the first match wins
function ruleFor(rules, date) {
  return rules.find((r) => r.startDate <= date && date <= r.endDate) || null
}
const adjust = (paise, pct) => (pct ? Math.max(0, paise + percentOf(paise, pct)) : paise)

export function nightlyRate(villa, rules, date) {
  const p = villa.pricing || {}
  const base = p.basePricePaise || Math.round((villa.startingPrice || 0) * 100)
  const weekday = weekdayOf(date)
  const isWeekend = weekday === 5 || weekday === 6 // Friday and Saturday night
  const normal = isWeekend && p.weekendPricePaise ? p.weekendPricePaise : base
  const rule = ruleFor(rules, date)
  if (!rule) return normal
  if (rule.nightPricePaise != null) return adjust(rule.nightPricePaise, rule.adjustPct)
  return adjust(normal, rule.adjustPct)
}

const QUARTER = 15 * 60 * 1000

/**
 * When a night that starts on `date` begins. Normally at the villa's check-in time. Booking tonight after that
 * time has gone is still allowed (same-day booking): the stay runs from now (rounded up to a quarter of an hour)
 * until the normal check-out time. No extra time is given: the guest
 * only gets what is left of the night, and it must start before midnight.
 * Returns { startAt, late }; late = true for such a same-day arrival, startAt = null when tonight is out of reach.
 */
export function nightStart(villa, date, now = new Date()) {
  const tz = villa.timezone || DEFAULT_TZ
  const usual = zonedToUtc(date, villa.checkInTime || '12:00', tz)
  if (usual.getTime() >= now.getTime()) return { startAt: usual, late: false }
  if (villa.allowSameDay === false || utcToZoned(now, tz).date !== date) return { startAt: usual, late: false }
  const earliest = new Date(Math.ceil(now.getTime() / QUARTER) * QUARTER)
  const midnight = zonedToUtc(addDays(date, 1), '00:00', tz)
  if (earliest >= midnight) return { startAt: null, late: true }
  return { startAt: earliest, late: true }
}

// The start / end instants of a selection, or a 400 when the selection does not make sense for this villa
export function resolveSelection(villa, mode, sel = {}, now = new Date()) {
  if (!isMode(mode)) throw badRequest('Choose a booking type: night stay, day use or hourly')
  if (!enabled(villa, mode)) throw badRequest('This villa does not offer that booking type')
  const tz = villa.timezone || DEFAULT_TZ

  if (mode === 'night') {
    const { checkIn, checkOut } = sel
    if (!isDateStr(checkIn) || !isDateStr(checkOut)) throw badRequest('Choose your check-in and check-out dates')
    const nights = diffDays(checkIn, checkOut)
    if (nights < 1) throw badRequest('Check-out must be after check-in')
    const { minNights = 1, maxNights = 365 } = villa.bookingModes.night
    if (nights < minNights) throw badRequest(`Minimum stay is ${minNights} night${minNights > 1 ? 's' : ''}`)
    if (nights > maxNights) throw badRequest(`Maximum stay is ${maxNights} nights`)
    const begin = nightStart(villa, checkIn, now)
    if (begin.late && !begin.startAt) throw badRequest('It is too late to check in tonight. Please choose tomorrow or later.')
    let startAt = begin.startAt
    let endAt = zonedToUtc(checkOut, villa.checkOutTime || '11:00', tz)
    // The guest may choose a later arrival and an earlier departure, never extra time beyond the villa's own times
    if (sel.checkInTime !== undefined && sel.checkInTime !== '') {
      if (!isTimeStr(sel.checkInTime)) throw badRequest('Choose a valid check-in time')
      const want = zonedToUtc(checkIn, sel.checkInTime, tz)
      if (want < startAt) throw badRequest(`Check-in is possible from ${utcToZoned(startAt, tz).time}`)
      startAt = want
    }
    if (sel.checkOutTime !== undefined && sel.checkOutTime !== '') {
      if (!isTimeStr(sel.checkOutTime)) throw badRequest('Choose a valid check-out time')
      const want = zonedToUtc(checkOut, sel.checkOutTime, tz)
      if (want > endAt) throw badRequest(`Check-out is by ${utcToZoned(endAt, tz).time}`)
      endAt = want
    }
    if (endAt <= startAt) throw badRequest('Check-out must be after check-in')
    return {
      mode, nights, tz,
      startAt,
      endAt,
      slot: { date: checkIn },
      lateArrival: begin.late,
    }
  }

  if (mode === 'dayUse') {
    const { date, packageId } = sel
    if (!isDateStr(date)) throw badRequest('Choose a date')
    const pkg = (villa.bookingModes.dayUse.packages || []).find((p) => String(p._id) === String(packageId))
    if (!pkg) throw badRequest('Choose a day-use package')
    if (toMinutes(pkg.endTime) <= toMinutes(pkg.startTime)) throw badRequest('This package has invalid timings')
    return {
      mode, nights: 0, tz, pkg,
      startAt: zonedToUtc(date, pkg.startTime, tz),
      endAt: zonedToUtc(date, pkg.endTime, tz),
      slot: { date, packageId: pkg._id, packageName: pkg.name },
    }
  }

  // hourly
  const { date, startTime } = sel
  const minutes = Number(sel.durationMinutes)
  if (!isDateStr(date)) throw badRequest('Choose a date')
  if (!isTimeStr(startTime)) throw badRequest('Choose a start time')
  const cfg = villa.bookingModes.hourly
  // Pay-per-hour villas take any whole number of hours; older villas offer fixed slot lengths
  const perHour = cfg.pricePerHourPaise || 0
  let option
  if (perHour) {
    const hours = minutes / 60
    if (!Number.isInteger(hours) || hours < (cfg.minHours || 1) || hours > (cfg.maxHours || 12)) throw badRequest(`Choose between ${cfg.minHours || 1} and ${cfg.maxHours || 12} hours`)
    option = { minutes, pricePaise: perHour * hours }
  } else {
    option = (cfg.durations || []).find((d) => d.minutes === minutes)
  }
  if (!option) throw badRequest('Choose a slot length')
  const open = toMinutes(cfg.openTime)
  const close = toMinutes(cfg.closeTime)
  const start = toMinutes(startTime)
  if (start < open || start + minutes > close) throw badRequest(`Slots run between ${cfg.openTime} and ${cfg.closeTime}`)
  if ((start - open) % (cfg.startStepMinutes || 60) !== 0) throw badRequest('Choose one of the listed start times')
  return {
    mode, nights: 0, tz, option,
    startAt: zonedToUtc(date, startTime, tz),
    endAt: new Date(zonedToUtc(date, startTime, tz).getTime() + minutes * 60 * 1000),
    slot: { date, durationMinutes: minutes },
  }
}

// How close to now a start may be, and how far ahead
export function assertBookable(villa, startAt, now = new Date()) {
  if (startAt.getTime() < now.getTime()) throw badRequest('That time has already passed')
  const ahead = (villa.maxAdvanceDays || 365) * 24 * 60 * 60 * 1000
  if (startAt.getTime() > now.getTime() + ahead) throw badRequest(`Bookings open up to ${villa.maxAdvanceDays || 365} days ahead`)
}

export function couponDiscount(coupon, basePaise, now = new Date()) {
  if (!coupon || coupon.status !== 'Active' || coupon.validTill < now) throw badRequest('This coupon is not valid')
  const value = coupon.discountType === 'percent' ? percentOf(basePaise, coupon.discountValue) : Math.round(coupon.discountValue * 100)
  return Math.min(value, basePaise)
}

/**
 * Full price breakdown for a selection. All amounts are whole paise.
 * Returns the interval too, so the caller reserves exactly what was priced.
 */
export function computeQuote({ villa, mode, selection, guests, rules = [], settings, coupon = null, now = new Date() }) {
  const sel = resolveSelection(villa, mode, selection, now)
  assertBookable(villa, sel.startAt, now)

  const maxGuests = mode === 'dayUse' ? sel.pkg.maxGuests || villa.maxGuests : villa.maxGuests
  const count = Number(guests)
  if (!Number.isInteger(count) || count < 1) throw badRequest('Enter the number of guests')
  if (maxGuests && count > maxGuests) throw badRequest(`This ${mode === 'dayUse' ? 'package' : 'villa'} allows up to ${maxGuests} guests`)

  const lines = []
  let roomPaise = 0
  let discountPaise = 0

  if (mode === 'night') {
    const dates = eachDate(selection.checkIn, selection.checkOut)
    const rates = dates.map((d) => nightlyRate(villa, rules, d))
    if (rates.some((r) => !r)) throw new HttpError(409, 'This villa has no price set for those dates')
    roomPaise = rates.reduce((a, b) => a + b, 0)
    const groups = new Map()
    for (const r of rates) groups.set(r, (groups.get(r) || 0) + 1)
    for (const [rate, n] of groups) lines.push({ label: `${formatInr(rate)} x ${n} night${n > 1 ? 's' : ''}`, amountPaise: rate * n })
    const p = villa.pricing || {}
    const pct = sel.nights >= 28 ? p.monthlyDiscountPct : sel.nights >= 7 ? p.weeklyDiscountPct : 0
    if (pct) {
      discountPaise = percentOf(roomPaise, pct)
      lines.push({ label: `${sel.nights >= 28 ? 'Monthly' : 'Weekly'} stay discount (${pct}%)`, amountPaise: -discountPaise })
    }
  } else {
    const price = mode === 'dayUse' ? sel.pkg.pricePaise : sel.option.pricePaise
    if (!price) throw new HttpError(409, 'This option has no price set')
    const rule = ruleFor(rules, sel.slot.date)
    roomPaise = adjust(price, rule?.adjustPct)
    lines.push({ label: mode === 'dayUse' ? sel.pkg.name : `${sel.option.minutes / 60} hour slot, ${selection.startTime}-${fromMinutes(toMinutes(selection.startTime) + sel.option.minutes)}`, amountPaise: roomPaise })
  }

  let couponPaise = 0
  if (coupon) {
    couponPaise = couponDiscount(coupon, roomPaise - discountPaise, now)
    lines.push({ label: `Coupon ${coupon.couponCode}`, amountPaise: -couponPaise })
  }

  const cleaningFeePaise = villa.pricing?.cleaningFeePaise || 0
  if (cleaningFeePaise) lines.push({ label: 'Cleaning fee', amountPaise: cleaningFeePaise })

  const taxable = roomPaise - discountPaise - couponPaise + cleaningFeePaise
  const taxPaise = percentOf(taxable, settings.stayGstRate || 0)
  if (taxPaise) lines.push({ label: `GST (${settings.stayGstRate}%)`, amountPaise: taxPaise })
  const totalPaise = taxable + taxPaise

  // What the platform keeps, taken from the stay amount before tax (rates come from admin settings)
  const commissionPaise = percentOf(taxable, settings.commissionRate || 0)
  const platformFeePaise = Math.round((settings.platformFee || 0) * 100)
  const commissionGstPaise = percentOf(commissionPaise + platformFeePaise, settings.gstRate || 0)
  const ownerPayoutPaise = Math.max(0, totalPaise - commissionPaise - platformFeePaise - commissionGstPaise)

  return {
    mode,
    startAt: sel.startAt,
    endAt: sel.endAt,
    tz: sel.tz,
    slot: sel.slot,
    lateArrival: Boolean(sel.lateArrival),
    guests: count,
    pricing: {
      lines, nights: sel.nights, roomPaise, discountPaise, couponCode: coupon?.couponCode || '', couponPaise,
      cleaningFeePaise, taxPaise, totalPaise, commissionPaise, platformFeePaise, commissionGstPaise, ownerPayoutPaise,
    },
  }
}

// Lowest price a villa shows on its card: cheapest of its enabled modes
export function startingPricePaise(villa) {
  const m = villa.bookingModes || {}
  const p = villa.pricing || {}
  const prices = []
  if (m.night?.enabled && p.basePricePaise) prices.push(p.basePricePaise)
  if (m.dayUse?.enabled) prices.push(...(m.dayUse.packages || []).map((x) => x.pricePaise).filter(Boolean))
  if (m.hourly?.enabled) prices.push(...(m.hourly.durations || []).map((x) => x.pricePaise).filter(Boolean), ...(m.hourly.pricePerHourPaise ? [m.hourly.pricePerHourPaise] : []))
  return prices.length ? Math.min(...prices) : 0
}

export { addDays }
