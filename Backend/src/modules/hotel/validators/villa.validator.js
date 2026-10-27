import mongoose from 'mongoose'
import { badRequest } from '../../../utils/httpError.js'
import { IMAGE_PATH_PATTERN } from '../../../utils/uploadPaths.js'
import { isTimeStr, isValidTz, toMinutes } from '../../../utils/time.js'

// Cleans what an owner sends for a villa. Only known fields get through, numbers are range-checked and
// prices must be whole paise. Returns a plain object of fields to set (only the ones that were sent).

const MAX_PAISE = 1_000_000_000 // Rs 1 crore
const text = (v, max, label, { required = false, min = 0 } = {}) => {
  const s = String(v ?? '').trim()
  if (required && !s) throw badRequest(`${label} is required`)
  if (s && s.length < min) throw badRequest(`${label} must be at least ${min} characters`)
  if (s.length > max) throw badRequest(`${label} can be at most ${max} characters`)
  return s
}
const int = (v, label, min, max) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n < min || n > max) throw badRequest(`${label} must be a whole number from ${min} to ${max}`)
  return n
}
const paise = (v, label) => int(v ?? 0, label, 0, MAX_PAISE)
const pct = (v, label) => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n) || n < 0 || n > 90) throw badRequest(`${label} must be between 0 and 90`)
  return n
}
const time = (v, label) => {
  if (!isTimeStr(v)) throw badRequest(`${label} must look like 14:30`)
  return v
}
const image = (v, label) => {
  const s = String(v ?? '').trim()
  if (s && !IMAGE_PATH_PATTERN.test(s)) throw badRequest(`${label} must be an uploaded image`)
  return s
}

function modes(input, current = {}) {
  const out = {}
  if (input.night) {
    const n = input.night
    const minNights = int(n.minNights ?? 1, 'Minimum nights', 1, 365)
    const maxNights = int(n.maxNights ?? 30, 'Maximum nights', 1, 365)
    if (minNights > maxNights) throw badRequest('Minimum nights cannot be more than maximum nights')
    out.night = { enabled: Boolean(n.enabled), minNights, maxNights }
  }
  for (const key of ['day', 'fullDayNight']) {
    if (!input[key]) continue
    const d = input[key]
    const label = key === 'day' ? 'Day' : 'Full day & night'
    const startTime = time(d.startTime ?? '10:00', `${label} start time`)
    const endTime = time(d.endTime ?? (key === 'day' ? '18:00' : '10:00'), `${label} end time`)
    // a day ends the same day it starts; a full day & night ends the next day, so only the day needs the order check
    if (key === 'day' && toMinutes(endTime) <= toMinutes(startTime)) throw badRequest('Day must end after it starts')
    if (key === 'day' && (toMinutes(startTime) < 6 * 60 || toMinutes(endTime) > 18 * 60)) throw badRequest('Day bookings are for daytime only: between 6:00 AM and 6:00 PM')
    out[key] = { enabled: Boolean(d.enabled), startTime, endTime, pricePaise: paise(d.pricePaise, `${label} price`), maxGuests: int(d.maxGuests ?? 0, `${label} guests`, 0, 200) }
    if (out[key].enabled && !out[key].pricePaise) throw badRequest(`Set a price for ${label}`)
  }
  for (const key of ['weekly', 'monthly']) {
    if (!input[key]) continue
    const w = input[key]
    const label = key === 'weekly' ? 'Weekly' : 'Monthly'
    const minNights = int(w.minNights ?? (key === 'weekly' ? 7 : 28), `${label} minimum nights`, 1, 365)
    const maxNights = int(w.maxNights ?? 365, `${label} maximum nights`, 1, 365)
    if (minNights > maxNights) throw badRequest(`${label} minimum nights cannot be more than maximum nights`)
    out[key] = { enabled: Boolean(w.enabled), minNights, maxNights, pricePerNightPaise: paise(w.pricePerNightPaise, `${label} price per night`) }
    if (out[key].enabled && !out[key].pricePerNightPaise) throw badRequest(`Set a price per night for ${label}`)
  }
  return out
}

export function cleanVilla(b = {}) {
  const set = {}
  const has = (k) => b[k] !== undefined

  if (has('name')) set.name = text(b.name, 80, 'Villa name', { required: true, min: 3 })
  if (has('description')) set.description = text(b.description, 2000, 'Description')
  if (has('propertyType')) set.propertyType = text(b.propertyType, 40, 'Property type') || 'Private Villa'
  if (has('address')) set.address = text(b.address, 250, 'Address')
  if (has('locality')) set.locality = text(b.locality, 80, 'Locality')
  // "jaipur  city" and "Jaipur City" become one spelling, so guests find every villa of a city together
  if (has('city')) set.city = text(b.city, 60, 'City', { required: true }).replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s-])(\S)/g, (m, a, c) => a + c.toUpperCase())
  if (has('state')) set.state = text(b.state, 60, 'State')
  if (has('country')) set.country = text(b.country, 60, 'Country') || 'India'
  if (has('pincode')) {
    const p = text(b.pincode, 10, 'Pincode')
    if (p && !/^\d{4,10}$/.test(p)) throw badRequest('Pincode must be 4 to 10 digits')
    set.pincode = p
  }
  if (has('mapUrl')) {
    const m = text(b.mapUrl, 500, 'Map link')
    if (m && !/^https:\/\/\S+$/.test(m)) throw badRequest('Map link must be an https URL')
    set.mapUrl = m
  }
  if (has('videoUrl')) {
    const v = text(b.videoUrl, 500, 'Video link')
    if (v && !/^(\/uploads\/\S+|https:\/\/\S+)$/.test(v)) throw badRequest('Video must be an uploaded file or an https link')
    set.videoUrl = v
  }
  if (b.geo !== undefined) {
    if (b.geo === null || b.geo.lat === '' || b.geo.lat === null) {
      set.geo = undefined
    } else {
      const lat = Number(b.geo.lat)
      const lng = Number(b.geo.lng)
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) throw badRequest('The map pin location is not valid')
      set.geo = { type: 'Point', coordinates: [lng, lat] }
    }
  }
  if (has('coverImage')) set.coverImage = image(b.coverImage, 'Cover photo')
  if (has('gallery')) {
    if (!Array.isArray(b.gallery) || b.gallery.length > 60) throw badRequest('Add at most 60 photos')
    set.gallery = b.gallery.map((g) => ({ url: image(g?.url, 'Photo'), category: text(g?.category, 30, 'Photo category') || 'Exterior' })).filter((g) => g.url)
  }
  if (has('bedrooms')) set.bedrooms = int(b.bedrooms, 'Bedrooms', 0, 50)
  if (has('beds')) set.beds = int(b.beds, 'Beds', 0, 100)
  if (has('bathrooms')) set.bathrooms = int(b.bathrooms, 'Bathrooms', 0, 50)
  if (has('maxGuests')) set.maxGuests = int(b.maxGuests, 'Maximum guests', 0, 200)
  if (has('amenities')) {
    if (!Array.isArray(b.amenities) || b.amenities.length > 80 || !b.amenities.every((a) => mongoose.isValidObjectId(a))) throw badRequest('Amenities are not valid')
    set.amenities = [...new Set(b.amenities.map(String))]
  }
  if (has('houseRules')) {
    if (!Array.isArray(b.houseRules) || b.houseRules.length > 20) throw badRequest('Add at most 20 house rules')
    set.houseRules = b.houseRules.map((r) => text(r, 150, 'House rule')).filter(Boolean)
  }
  if (has('checkInTime')) {
    set.checkInTime = time(b.checkInTime, 'Check-in time')
    if (toMinutes(set.checkInTime) < 12 * 60) throw badRequest('Night check-in is from 12:00 PM to 11:59 PM')
  }
  if (has('checkOutTime')) {
    set.checkOutTime = time(b.checkOutTime, 'Check-out time')
    if (toMinutes(set.checkOutTime) < 5 * 60 || toMinutes(set.checkOutTime) > 12 * 60) throw badRequest('Night check-out is the next morning, from 5:00 AM to 12:00 PM')
  }
  if (has('timezone')) {
    if (!isValidTz(b.timezone)) throw badRequest('Time zone is not valid')
    set.timezone = b.timezone
  }
  if (has('confirmationMode')) {
    if (!['instant', 'request'].includes(b.confirmationMode)) throw badRequest('Choose instant booking or request to book')
    set.confirmationMode = b.confirmationMode
  }
  if (has('allowSameDay')) set.allowSameDay = Boolean(b.allowSameDay)
  if (has('maxAdvanceDays')) set.maxAdvanceDays = int(b.maxAdvanceDays, 'Advance booking window', 1, 730)

  if (b.pricing) {
    const p = b.pricing
    set.pricing = {
      basePricePaise: paise(p.basePricePaise, 'Nightly price'),
      weekendPricePaise: paise(p.weekendPricePaise, 'Weekend price'),
      weeklyDiscountPct: pct(p.weeklyDiscountPct, 'Weekly discount'),
      monthlyDiscountPct: pct(p.monthlyDiscountPct, 'Monthly discount'),
      cleaningFeePaise: paise(p.cleaningFeePaise, 'Cleaning fee'),
    }
  }
  if (b.bookingModes) set.bookingModes = modes(b.bookingModes)
  return set
}

// What is still missing before a villa can be sent for approval (empty = ready)
export function missingForSubmit(v) {
  const missing = []
  if (!v.name || v.name.length < 3) missing.push('villa name')
  if ((v.description || '').length < 30) missing.push('a description of at least 30 characters')
  if (!v.state) missing.push('state')
  if (!v.city) missing.push('city')
  if (!v.address) missing.push('full address')
  if (!v.coverImage) missing.push('cover photo')
  if ((v.gallery || []).length < 3) missing.push('at least 3 gallery photos')
  if (!(v.bedrooms >= 1)) missing.push('number of bedrooms')
  if (!(v.bathrooms >= 1)) missing.push('number of bathrooms')
  if (!(v.maxGuests >= 1)) missing.push('maximum guests')
  const m = v.bookingModes || {}
  const priced = [
    m.night?.enabled && v.pricing?.basePricePaise > 0,
    m.day?.enabled && m.day.pricePaise > 0,
    m.fullDayNight?.enabled && m.fullDayNight.pricePaise > 0,
    m.weekly?.enabled && m.weekly.pricePerNightPaise > 0,
    m.monthly?.enabled && m.monthly.pricePerNightPaise > 0,
  ].some(Boolean)
  if (!priced) missing.push('at least one booking type with a price')
  return missing
}
