import mongoose from 'mongoose'
import Hotel from '../../../models/Hotel.model.js'
import Amenity from '../../../models/Amenity.model.js'
import AvailabilityBlock from '../../../models/AvailabilityBlock.model.js'
import Coupon from '../../../models/Coupon.model.js'
import Banner from '../../../models/Banner.model.js'
import { villaCard } from './home.controller.js'
import { inActiveState } from '../../../utils/activeStates.js'
import { zonedToUtc } from '../../../utils/time.js'

// Public search and discovery: villa listing with filters, filter options, suggestions, destinations, offers.

const PAGE_SIZE = 12
const MAX_PAGE_SIZE = 24

const escapeRx = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const num = (v) => {
  if (v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const date = (v) => {
  const d = new Date(`${String(v || '').slice(0, 10)}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}
const list = (v) => (v ? String(v).split(',').map((x) => x.trim()).filter(Boolean) : [])

const SORTS = {
  popular: { rating: -1, createdAt: -1 },
  price_asc: { startingPrice: 1, rating: -1 },
  price_desc: { startingPrice: -1, rating: -1 },
  rating: { rating: -1, createdAt: -1 },
  newest: { createdAt: -1 },
}

const listItem = (h) => ({
  ...villaCard(h),
  propertyType: h.propertyType || 'Private Villa',
  bedrooms: h.bedrooms || 0,
  bathrooms: h.bathrooms || 0,
  maxGuests: h.maxGuests || 0,
})

// GET /user/villas?q=&city=&type=&checkIn=&checkOut=&guests=&minPrice=&maxPrice=&rating=&bedrooms=&amenities=a,b&sort=&page=&limit=
export async function searchVillas(req, res) {
  const qs = req.query
  const and = [{ status: 'Active' }, await inActiveState()]

  // Every word has to match somewhere (name, place or type), so "goa pool" finds pool villas in Goa
  const words = String(qs.q || '').trim().split(/\s+/).filter(Boolean).slice(0, 5)
  for (const w of words) {
    const rx = new RegExp(escapeRx(w), 'i')
    and.push({ $or: [{ name: rx }, { city: rx }, { state: rx }, { address: rx }, { propertyType: rx }] })
  }

  const state = String(qs.state || '').trim()
  if (state) and.push({ state: new RegExp(`^${escapeRx(state)}$`, 'i') })
  const city = String(qs.city || '').trim()
  if (city) and.push({ city: new RegExp(`^${escapeRx(city)}$`, 'i') })

  // Home categories ("Beach", "Hill Stations"): matched against what the villa says about itself
  const type = String(qs.type || '').trim().replace(/-/g, ' ')
  if (type) {
    const rx = new RegExp(escapeRx(type.replace(/s$/i, '')), 'i')
    and.push({ $or: [{ propertyType: rx }, { name: rx }, { description: rx }, { address: rx }, { city: rx }] })
  }

  const guests = num(qs.guests)
  if (guests) and.push({ $or: [{ maxGuests: { $gte: guests } }, { maxGuests: 0 }] }) // 0 = capacity not filled in yet
  const minPrice = num(qs.minPrice)
  const maxPrice = num(qs.maxPrice)
  if (minPrice !== null) and.push({ startingPrice: { $gte: minPrice } })
  if (maxPrice !== null) and.push({ startingPrice: { $lte: maxPrice } })
  const rating = num(qs.rating)
  if (rating) and.push({ rating: { $gte: rating } })
  const bedrooms = num(qs.bedrooms)
  if (bedrooms) and.push({ bedrooms: { $gte: bedrooms } })
  const amenities = list(qs.amenities).filter((a) => mongoose.isValidObjectId(a))
  if (amenities.length) and.push({ amenities: { $all: amenities } })

  const checkIn = date(qs.checkIn)
  const checkOut = date(qs.checkOut)
  if (checkIn && checkOut && checkOut > checkIn) {
    // A villa is taken when anything (booking, hold or owner block) overlaps the stay, from check-in time to check-out time
    const now = new Date()
    const from = zonedToUtc(String(qs.checkIn).slice(0, 10), '12:00')
    const to = zonedToUtc(String(qs.checkOut).slice(0, 10), '11:00')
    const taken = await AvailabilityBlock.distinct('villa', { released: { $ne: true }, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }], startAt: { $lt: to }, blockedUntil: { $gt: from } })
    if (taken.length) and.push({ _id: { $nin: taken } })
  }

  const filter = { $and: and }
  const limit = Math.min(Math.max(Math.floor(num(qs.limit)) || PAGE_SIZE, 1), MAX_PAGE_SIZE)
  const page = Math.max(Math.floor(num(qs.page)) || 1, 1)
  const sort = SORTS[qs.sort] || SORTS.popular

  const [total, docs] = await Promise.all([
    Hotel.countDocuments(filter),
    Hotel.find(filter).sort({ ...sort, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
  ])

  res.json({
    success: true,
    data: { items: docs.map(listItem), total, page, pages: Math.max(Math.ceil(total / limit), 1) },
  })
}

// GET /user/villas/filters: what the filter sheet can offer, taken from the active villas
export async function villaFilters(req, res) {
  const active = { status: 'Active', ...(await inActiveState()) }
  const [states, cities, price, types, amenityIds] = await Promise.all([
    Hotel.aggregate([{ $match: active }, { $group: { _id: '$state', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
    Hotel.aggregate([{ $match: active }, { $group: { _id: { state: '$state', city: '$city' }, count: { $sum: 1 } } }, { $sort: { count: -1, '_id.city': 1 } }]),
    Hotel.aggregate([{ $match: { ...active, startingPrice: { $gt: 0 } } }, { $group: { _id: null, min: { $min: '$startingPrice' }, max: { $max: '$startingPrice' } } }]),
    Hotel.distinct('propertyType', active),
    Hotel.distinct('amenities', active),
  ])
  const amenities = amenityIds.length ? await Amenity.find({ _id: { $in: amenityIds }, status: 'Active' }).sort({ name: 1 }).lean() : []

  res.json({
    success: true,
    data: {
      states: states.map((x) => ({ state: x._id, count: x.count })),
      cities: cities.map((c) => ({ city: c._id.city, state: c._id.state, count: c.count })),
      price: { min: price[0]?.min || 0, max: price[0]?.max || 0 },
      propertyTypes: types.filter(Boolean).sort(),
      amenities: amenities.map((a) => ({ id: String(a._id), name: a.name, category: a.category })),
    },
  })
}

// GET /user/search/suggestions?q=: cities and villa names for the search box
export async function suggestions(req, res) {
  const q = String(req.query.q || '').trim()
  if (q.length < 2) return res.json({ success: true, data: [] })
  const rx = new RegExp(escapeRx(q), 'i')
  const live = await inActiveState()
  const [cities, villas] = await Promise.all([
    Hotel.aggregate([{ $match: { status: 'Active', ...live, city: rx } }, { $group: { _id: '$city', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 4 }]),
    Hotel.find({ status: 'Active', ...live, name: rx }).sort({ rating: -1 }).limit(5).select('name city').lean(),
  ])
  res.json({
    success: true,
    data: [
      ...cities.map((c) => ({ type: 'city', label: c._id, sub: `${c.count} ${c.count === 1 ? 'villa' : 'villas'}`, value: c._id })),
      ...villas.map((v) => ({ type: 'villa', label: v.name, sub: v.city, id: String(v._id) })),
    ],
  })
}

// GET /user/destinations: every city that has active villas
export async function destinations(req, res) {
  const rows = await Hotel.aggregate([
    { $match: { status: 'Active', ...(await inActiveState()) } },
    { $sort: { rating: -1, startingPrice: 1 } },
    {
      $group: {
        _id: '$city',
        state: { $first: '$state' },
        count: { $sum: 1 },
        price: { $min: { $cond: [{ $gt: ['$startingPrice', 0] }, '$startingPrice', null] } },
        image: { $first: '$coverImage' },
      },
    },
    { $sort: { count: -1, _id: 1 } },
  ])
  res.json({ success: true, data: rows.map((r) => ({ city: r._id, state: r.state || '', count: r.count, price: r.price || 0, image: r.image || '' })) })
}

const discountText = (c) => (c.discountType === 'percent' ? `${c.discountValue}% OFF` : `₹${Number(c.discountValue).toLocaleString('en-IN')} OFF`)

// GET /user/offers: coupons that can be used today and the active banners
export async function offers(req, res) {
  const now = new Date()
  const [coupons, banners] = await Promise.all([
    Coupon.find({ status: 'Active', validTill: { $gte: now } }).sort({ validTill: 1 }).lean(),
    Banner.find({ status: 'Active', $or: [{ validTill: null }, { validTill: { $exists: false } }, { validTill: { $gte: now } }] }).sort({ createdAt: -1 }).lean(),
  ])
  res.json({
    success: true,
    data: {
      coupons: coupons.map((c) => ({ id: String(c._id), code: c.couponCode, text: discountText(c), type: c.discountType, value: c.discountValue, validTill: c.validTill })),
      banners: banners.filter((b) => b.imageUrl).map((b) => ({ id: String(b._id), title: b.title, image: b.imageUrl })),
    },
  })
}
