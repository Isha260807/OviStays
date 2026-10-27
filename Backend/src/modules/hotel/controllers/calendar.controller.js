import mongoose from 'mongoose'
import AvailabilityBlock from '../../../models/AvailabilityBlock.model.js'
import PriceRule from '../../../models/PriceRule.model.js'
import Booking from '../../../models/Booking.model.js'
import { HttpError, badRequest, notFound } from '../../../utils/httpError.js'
import { DEFAULT_TZ, addDays, diffDays, isDateStr, isTimeStr, toMinutes, zonedToUtc } from '../../../utils/time.js'
import { blockedUntilOf, findConflicts, nightAvailability, placeBlock, withVillaLock } from '../../user/services/availability.service.js'
import { ownVilla } from './villa.controller.js'

const MAX_RANGE_DAYS = 93

// GET /hotel/villas/:id/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
// Everything on one villa's calendar in the range: bookings, holds, owner blocks, and the price of each night.
export async function getCalendar(req, res) {
  const villa = await ownVilla(req)
  const { from, to } = req.query
  if (!isDateStr(from) || !isDateStr(to) || diffDays(from, to) < 1 || diffDays(from, to) > MAX_RANGE_DAYS) throw badRequest(`Choose a date range of up to ${MAX_RANGE_DAYS} days`)
  const tz = villa.timezone || DEFAULT_TZ
  const start = zonedToUtc(from, '00:00', tz)
  const end = zonedToUtc(to, '00:00', tz)
  const now = new Date()

  const [blocks, rules] = await Promise.all([
    AvailabilityBlock.find({ villa: villa._id, released: { $ne: true }, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }], startAt: { $lt: end }, blockedUntil: { $gt: start } }).sort({ startAt: 1 }).lean(),
    PriceRule.find({ villa: villa._id }).sort({ startDate: 1 }).lean(),
  ])
  const bookings = await Booking.find({ _id: { $in: blocks.map((b) => b.booking).filter(Boolean) }, ownerId: req.owner._id }).select('refId guestName guests status mode pricing.totalPaise slot').lean()
  const byId = new Map(bookings.map((b) => [String(b._id), b]))
  const nights = await nightAvailability(villa.toObject(), rules, from, to)

  res.json({
    success: true,
    data: {
      timezone: tz,
      from, to,
      blocks: blocks.map((b) => {
        const bk = byId.get(String(b.booking))
        return {
          id: String(b._id), type: b.type, mode: b.mode, startAt: b.startAt, endAt: b.endAt, expiresAt: b.expiresAt, reason: b.reason,
          booking: bk ? { id: String(bk._id), code: bk.refId, guest: bk.guestName, guests: bk.guests, status: bk.status, totalPaise: bk.pricing?.totalPaise || 0 } : null,
        }
      }),
      nights,
      priceRules: rules.map(ruleView),
    },
  })
}

// POST /hotel/villas/:id/blocks
//   { kind: 'nights', from, to, reason }                 block the nights from..to (to = last night, inclusive)
//   { kind: 'time', date, startTime, endTime, reason }   block part of one day
export async function createBlock(req, res) {
  const villa = await ownVilla(req)
  const b = req.body || {}
  const tz = villa.timezone || DEFAULT_TZ
  const reason = String(b.reason || '').trim().slice(0, 200)
  let startAt
  let endAt
  let label

  if (b.kind === 'time') {
    if (!isDateStr(b.date) || !isTimeStr(b.startTime) || !isTimeStr(b.endTime)) throw badRequest('Choose a date, start time and end time')
    if (toMinutes(b.endTime) <= toMinutes(b.startTime)) throw badRequest('End time must be after start time')
    startAt = zonedToUtc(b.date, b.startTime, tz)
    endAt = zonedToUtc(b.date, b.endTime, tz)
    label = `${b.date} ${b.startTime}-${b.endTime}`
  } else {
    if (!isDateStr(b.from) || !isDateStr(b.to) || b.to < b.from) throw badRequest('Choose the first and last night to block')
    if (diffDays(b.from, b.to) > 365) throw badRequest('You can block at most a year at a time')
    startAt = zonedToUtc(b.from, villa.checkInTime || '12:00', tz)
    endAt = zonedToUtc(addDays(b.to, 1), villa.checkOutTime || '11:00', tz)
    label = `${b.from} to ${b.to}`
  }
  if (endAt <= new Date()) throw badRequest('That time has already passed')

  const block = await withVillaLock(villa._id, async () => {
    const clash = await findConflicts(villa._id, startAt, blockedUntilOf(villa, endAt))
    if (clash.length) throw new HttpError(409, `${label} overlaps ${clash.length} existing booking(s) or hold(s). Cancel those first, or choose other dates.`)
    return placeBlock(villa, { type: 'owner_block', mode: 'manual', owner: req.owner._id, startAt, endAt, reason })
  })
  res.status(201).json({ success: true, message: 'Blocked', data: { id: String(block._id), startAt: block.startAt, endAt: block.endAt, reason: block.reason } })
}

// DELETE /hotel/villas/:id/blocks/:blockId   only the owner's own blocks, never a guest's booking
export async function removeBlock(req, res) {
  const villa = await ownVilla(req)
  if (!mongoose.isValidObjectId(req.params.blockId)) throw notFound('Block not found')
  const done = await AvailabilityBlock.updateOne({ _id: req.params.blockId, villa: villa._id, type: 'owner_block', released: false }, { released: true })
  if (!done.matchedCount) throw notFound('Block not found')
  res.json({ success: true })
}

// ---- date-specific prices --------------------------------------------------------------------------------

const ruleView = (r) => ({ id: String(r._id), label: r.label, startDate: r.startDate, endDate: r.endDate, nightPricePaise: r.nightPricePaise, adjustPct: r.adjustPct })

function cleanRule(b) {
  if (!isDateStr(b.startDate) || !isDateStr(b.endDate) || b.endDate < b.startDate) throw badRequest('Choose a start date and an end date after it')
  if (diffDays(b.startDate, b.endDate) > 366) throw badRequest('A price period can be at most a year long')
  const price = b.nightPricePaise === '' || b.nightPricePaise == null ? null : Number(b.nightPricePaise)
  const adjust = b.adjustPct === '' || b.adjustPct == null ? null : Number(b.adjustPct)
  if (price === null && adjust === null) throw badRequest('Set a nightly price or a percentage change')
  if (price !== null && (!Number.isInteger(price) || price <= 0 || price > 1_000_000_000)) throw badRequest('Nightly price is not valid')
  if (adjust !== null && (!Number.isFinite(adjust) || adjust < -90 || adjust > 500)) throw badRequest('Percentage change must be between -90 and 500')
  return { label: String(b.label || '').trim().slice(0, 60), startDate: b.startDate, endDate: b.endDate, nightPricePaise: price, adjustPct: adjust }
}

async function assertNoOverlap(villaId, rule, exceptId) {
  const clash = await PriceRule.findOne({ villa: villaId, startDate: { $lte: rule.endDate }, endDate: { $gte: rule.startDate }, ...(exceptId ? { _id: { $ne: exceptId } } : {}) })
  if (clash) throw new HttpError(409, `These dates overlap another price period (${clash.label || clash.startDate + ' to ' + clash.endDate})`)
}

export async function listRules(req, res) {
  const villa = await ownVilla(req)
  const rules = await PriceRule.find({ villa: villa._id }).sort({ startDate: 1 }).lean()
  res.json({ success: true, data: rules.map(ruleView) })
}

export async function createRule(req, res) {
  const villa = await ownVilla(req)
  const rule = cleanRule(req.body || {})
  await assertNoOverlap(villa._id, rule)
  const doc = await PriceRule.create({ ...rule, villa: villa._id, owner: req.owner._id })
  res.status(201).json({ success: true, data: ruleView(doc) })
}

export async function updateRule(req, res) {
  const villa = await ownVilla(req)
  if (!mongoose.isValidObjectId(req.params.ruleId)) throw notFound('Price period not found')
  const doc = await PriceRule.findOne({ _id: req.params.ruleId, villa: villa._id })
  if (!doc) throw notFound('Price period not found')
  const rule = cleanRule({ ...doc.toObject(), ...req.body })
  await assertNoOverlap(villa._id, rule, doc._id)
  doc.set(rule)
  await doc.save()
  res.json({ success: true, data: ruleView(doc) })
}

export async function removeRule(req, res) {
  const villa = await ownVilla(req)
  if (!mongoose.isValidObjectId(req.params.ruleId)) throw notFound('Price period not found')
  const done = await PriceRule.deleteOne({ _id: req.params.ruleId, villa: villa._id })
  if (!done.deletedCount) throw notFound('Price period not found')
  res.json({ success: true })
}
