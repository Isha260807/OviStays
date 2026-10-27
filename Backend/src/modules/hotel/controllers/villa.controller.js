import mongoose from 'mongoose'
import Hotel from '../../../models/Hotel.model.js'
import Booking, { LIVE_STATUSES } from '../../../models/Booking.model.js'
import Amenity from '../../../models/Amenity.model.js'
import Location from '../../../models/Location.model.js'
import { audit } from '../../../models/AuditLog.model.js'
import { HttpError, badRequest, notFound } from '../../../utils/httpError.js'
import { cleanVilla, missingForSubmit } from '../validators/villa.validator.js'
import { startingPricePaise } from '../../user/services/pricing.service.js'

// Owner's own villas. Ownership always comes from the signed-in owner (req.owner), never from the request:
// every query below filters by ownerId, so another owner's villa simply "does not exist" for them.

export async function ownVilla(req, id = req.params.id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('Villa not found')
  const villa = await Hotel.findOne({ _id: id, ownerId: req.owner._id })
  if (!villa) throw notFound('Villa not found')
  return villa
}

export const villaView = (h) => ({
  id: String(h._id),
  refId: h.refId,
  name: h.name,
  description: h.description || '',
  propertyType: h.propertyType || 'Private Villa',
  address: h.address || '',
  locality: h.locality || '',
  city: h.city || '',
  state: h.state || '',
  country: h.country || 'India',
  pincode: h.pincode || '',
  mapUrl: h.mapUrl || '',
  videoUrl: h.videoUrl || '',
  geo: h.geo?.coordinates?.length ? { lat: h.geo.coordinates[1], lng: h.geo.coordinates[0] } : null,
  coverImage: h.coverImage || '',
  gallery: (h.gallery || []).map((g) => ({ url: g.url, category: g.category })),
  bedrooms: h.bedrooms || 0,
  beds: h.beds || 0,
  bathrooms: h.bathrooms || 0,
  maxGuests: h.maxGuests || 0,
  amenities: (h.amenities || []).map(String),
  houseRules: h.houseRules || [],
  checkInTime: h.checkInTime || '12:00',
  checkOutTime: h.checkOutTime || '11:00',
  timezone: h.timezone || 'Asia/Kolkata',
  confirmationMode: h.confirmationMode || 'instant',
  allowSameDay: h.allowSameDay !== false,
  maxAdvanceDays: h.maxAdvanceDays || 365,
  pricing: {
    basePricePaise: h.pricing?.basePricePaise || 0,
    weekendPricePaise: h.pricing?.weekendPricePaise || 0,
    weeklyDiscountPct: h.pricing?.weeklyDiscountPct || 0,
    monthlyDiscountPct: h.pricing?.monthlyDiscountPct || 0,
    cleaningFeePaise: h.pricing?.cleaningFeePaise || 0,
  },
  bookingModes: {
    night: { enabled: Boolean(h.bookingModes?.night?.enabled), minNights: h.bookingModes?.night?.minNights || 1, maxNights: h.bookingModes?.night?.maxNights || 30 },
    dayUse: { enabled: Boolean(h.bookingModes?.dayUse?.enabled), packages: (h.bookingModes?.dayUse?.packages || []).map((p) => ({ id: String(p._id), name: p.name, startTime: p.startTime, endTime: p.endTime, pricePaise: p.pricePaise, maxGuests: p.maxGuests })) },
    hourly: { enabled: Boolean(h.bookingModes?.hourly?.enabled), openTime: h.bookingModes?.hourly?.openTime || '09:00', closeTime: h.bookingModes?.hourly?.closeTime || '21:00', startStepMinutes: h.bookingModes?.hourly?.startStepMinutes || 60, pricePerHourPaise: h.bookingModes?.hourly?.pricePerHourPaise || 0, minHours: h.bookingModes?.hourly?.minHours || 1, maxHours: h.bookingModes?.hourly?.maxHours || 12, durations: (h.bookingModes?.hourly?.durations || []).map((d) => ({ minutes: d.minutes, pricePaise: d.pricePaise })) },
  },
  rating: h.rating || 0,
  listingStatus: h.listingStatus || 'Draft',
  rejectionReason: h.rejectionReason || '',
  submittedAt: h.submittedAt || null,
  approvedAt: h.approvedAt || null,
  isPublic: h.status === 'Active',
  createdAt: h.createdAt,
  updatedAt: h.updatedAt,
})

// Keeps the fields other parts of the app read (card price, room count, owner name) in step
function syncDerived(villa, owner) {
  villa.owner = owner.name
  villa.rooms = villa.bedrooms || 0
  const low = startingPricePaise(villa)
  villa.startingPrice = low ? Math.ceil(low / 100) : 0
}

export async function list(req, res) {
  const villas = await Hotel.find({ ownerId: req.owner._id }).sort({ createdAt: -1 })
  const open = await Booking.aggregate([
    { $match: { ownerId: req.owner._id } },
    { $group: { _id: '$hotel', pending: { $sum: { $cond: [{ $eq: ['$status', 'Requested'] }, 1, 0] } }, upcoming: { $sum: { $cond: [{ $and: [{ $in: ['$status', ['Confirmed']] }, { $gte: ['$checkIn', new Date()] }] }, 1, 0] } } } },
  ])
  const counts = new Map(open.map((o) => [String(o._id), o]))
  res.json({ success: true, data: villas.map((v) => ({ ...villaView(v), pendingRequests: counts.get(String(v._id))?.pending || 0, upcomingBookings: counts.get(String(v._id))?.upcoming || 0 })) })
}

export async function get(req, res) {
  res.json({ success: true, data: villaView(await ownVilla(req)) })
}

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// The city must be one the admin added under Admin > Locations (and left Active). The state comes from that
// location, so the two can never disagree. Returns the canonical { city, state }.
async function resolveLocation(city) {
  const loc = await Location.findOne({ city: new RegExp(`^${escapeRx(String(city).trim())}$`, 'i'), status: 'Active' }).lean()
  if (!loc) throw badRequest('Choose a city from the list. Cities are added by the OviStays team.')
  return { city: loc.city, state: loc.state }
}

// GET /hotel/locations   the cities an owner can choose from
export async function locations(req, res) {
  const items = await Location.find({ status: 'Active' }).sort({ city: 1 }).lean()
  res.json({ success: true, data: items.map((l) => ({ city: l.city, state: l.state })) })
}

// POST /hotel/villas   (starts as a Draft; name and city are enough to begin)
export async function create(req, res) {
  const set = cleanVilla(req.body)
  if (set.city) Object.assign(set, await resolveLocation(set.city))
  if (!set.name) throw badRequest('Villa name is required')
  if (!set.city) throw badRequest('City is required')
  const villa = new Hotel({ ...set, ownerId: req.owner._id, owner: req.owner.name, listingStatus: 'Draft' })
  syncDerived(villa, req.owner)
  await villa.save()
  audit({ actorType: 'owner', actorId: req.owner._id, action: 'villa.created', targetType: 'Hotel', targetId: villa._id })
  res.status(201).json({ success: true, message: 'Villa created as a draft', data: villaView(villa) })
}

// PATCH /hotel/villas/:id
export async function update(req, res) {
  const villa = await ownVilla(req)
  if (villa.listingStatus === 'Suspended') throw new HttpError(403, 'This villa is suspended. Please contact support.')
  const set = cleanVilla(req.body)
  // A city is checked when it is new or changed; a villa that already had a city keeps it even if the admin later hides it
  if (set.city && set.city !== villa.city) Object.assign(set, await resolveLocation(set.city))
  else delete set.state
  if (!Object.keys(set).length) throw badRequest('Nothing to update')

  // Day-use packages keep their id so bookings made on them stay valid
  if (set.bookingModes?.dayUse) {
    const existing = new Set((villa.bookingModes?.dayUse?.packages || []).map((p) => String(p._id)))
    set.bookingModes.dayUse.packages = set.bookingModes.dayUse.packages.map((p) => (p._id && !existing.has(String(p._id)) ? { ...p, _id: undefined } : p))
  }
  for (const [key, value] of Object.entries(set)) {
    if (key === 'pricing') {
      for (const [k, v] of Object.entries(value)) villa.set(`pricing.${k}`, v)
    } else if (key === 'bookingModes') {
      for (const [mode, cfg] of Object.entries(value)) for (const [k, v] of Object.entries(cfg)) villa.set(`bookingModes.${mode}.${k}`, v)
    } else villa.set(key, value)
  }
  syncDerived(villa, req.owner)
  await villa.save()
  res.json({ success: true, message: 'Villa saved', data: villaView(villa) })
}

// POST /hotel/villas/:id/submit   Draft or Rejected -> Pending Approval
export async function submit(req, res) {
  const villa = await ownVilla(req)
  if (!['Draft', 'Rejected'].includes(villa.listingStatus)) throw new HttpError(409, `A villa that is ${villa.listingStatus.toLowerCase()} cannot be submitted`)
  if (req.owner.kyc.status !== 'Verified') throw new HttpError(403, 'Complete your KYC and wait for verification before submitting a villa')
  const missing = missingForSubmit(villa)
  if (missing.length) throw badRequest(`Please add: ${missing.join(', ')}`)
  villa.listingStatus = 'Pending Approval'
  villa.rejectionReason = ''
  villa.submittedAt = new Date()
  await villa.save()
  audit({ actorType: 'owner', actorId: req.owner._id, action: 'villa.submitted', targetType: 'Hotel', targetId: villa._id })
  res.json({ success: true, message: 'Sent for approval. We will review it shortly.', data: villaView(villa) })
}

// POST /hotel/villas/:id/active   { active: true | false }   switches a live listing off and on
export async function setActive(req, res) {
  const villa = await ownVilla(req)
  const active = req.body?.active
  if (typeof active !== 'boolean') throw badRequest('active must be true or false')
  if (active) {
    if (villa.listingStatus !== 'Inactive' || !villa.approvedAt) throw new HttpError(409, 'Only a villa you switched off can be switched back on')
    villa.listingStatus = 'Approved'
  } else {
    if (villa.listingStatus !== 'Approved') throw new HttpError(409, 'Only a live villa can be switched off')
    villa.listingStatus = 'Inactive'
  }
  await villa.save()
  const upcoming = active ? 0 : await Booking.countDocuments({ hotel: villa._id, status: { $in: LIVE_STATUSES }, checkOut: { $gte: new Date() } })
  audit({ actorType: 'owner', actorId: req.owner._id, action: active ? 'villa.activated' : 'villa.deactivated', targetType: 'Hotel', targetId: villa._id })
  res.json({
    success: true,
    message: active ? 'Villa is live again' : upcoming ? `Villa is hidden from search. ${upcoming} existing booking(s) stay valid.` : 'Villa is hidden from search',
    data: villaView(villa),
  })
}

// DELETE /hotel/villas/:id   only a draft that never had a booking
export async function remove(req, res) {
  const villa = await ownVilla(req)
  if (villa.listingStatus !== 'Draft') throw new HttpError(409, 'Only drafts can be deleted. Switch a live villa off instead.')
  if (await Booking.exists({ hotel: villa._id })) throw new HttpError(409, 'This villa has bookings and cannot be deleted')
  await villa.deleteOne()
  res.json({ success: true })
}

// GET /hotel/amenities   the list to pick from
export async function amenities(req, res) {
  const items = await Amenity.find({ status: 'Active' }).sort({ category: 1, name: 1 }).lean()
  res.json({ success: true, data: items.map((a) => ({ id: String(a._id), name: a.name, category: a.category })) })
}
