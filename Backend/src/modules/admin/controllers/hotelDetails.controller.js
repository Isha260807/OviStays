import mongoose from 'mongoose'
import Hotel, { HIGHLIGHT_ICONS } from '../../../models/Hotel.model.js'
import Amenity from '../../../models/Amenity.model.js'
import { badRequest, notFound } from '../../../utils/httpError.js'

// The villa details page: everything the user sees on /villas/:id besides name, city and status.

const text = (v, max) => String(v ?? '').trim().slice(0, max)
const num = (v, max) => Math.min(max, Math.max(0, Number(v) || 0))
const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : [])

const view = (h) => ({
  _id: h._id,
  name: h.name,
  city: h.city,
  status: h.status,
  description: h.description || '',
  coverImage: h.coverImage || '',
  propertyType: h.propertyType || 'Private Villa',
  bedrooms: h.bedrooms || 0,
  bathrooms: h.bathrooms || 0,
  maxGuests: h.maxGuests || 0,
  startingPrice: h.startingPrice || 0,
  checkInTime: h.checkInTime || '',
  checkOutTime: h.checkOutTime || '',
  cancellationPolicy: h.cancellationPolicy || '',
  paymentInfo: h.paymentInfo || '',
  mapUrl: h.mapUrl || '',
  videoUrl: h.videoUrl || '',
  amenities: (h.amenities || []).map(String),
  highlights: h.highlights || [],
  gallery: h.gallery || [],
  spaces: h.spaces || [],
})

async function findHotel(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound()
  const hotel = await Hotel.findById(id)
  if (!hotel) throw notFound('Villa not found')
  return hotel
}

export async function getDetails(req, res) {
  res.json({ success: true, data: view((await findHotel(req.params.id)).toObject()) })
}

export async function updateDetails(req, res) {
  const hotel = await findHotel(req.params.id)
  const b = req.body || {}

  hotel.description = text(b.description, 2000)
  hotel.coverImage = text(b.coverImage, 500)
  hotel.propertyType = text(b.propertyType, 40) || 'Private Villa'
  hotel.bedrooms = num(b.bedrooms, 50)
  hotel.bathrooms = num(b.bathrooms, 50)
  hotel.maxGuests = num(b.maxGuests, 200)
  hotel.startingPrice = num(b.startingPrice, 10_000_000)
  hotel.checkInTime = text(b.checkInTime, 10) || '12:00'
  hotel.checkOutTime = text(b.checkOutTime, 10) || '11:00'
  hotel.cancellationPolicy = text(b.cancellationPolicy, 200)
  hotel.paymentInfo = text(b.paymentInfo, 120)
  hotel.mapUrl = text(b.mapUrl, 500)
  hotel.videoUrl = text(b.videoUrl, 500)

  // Only amenities that exist, once each
  const wanted = [...new Set(arr(b.amenities, 60).filter((i) => mongoose.isValidObjectId(i)).map(String))]
  const found = await Amenity.find({ _id: { $in: wanted } }).select('_id').lean()
  const ok = new Set(found.map((a) => String(a._id)))
  hotel.amenities = wanted.filter((i) => ok.has(i))

  hotel.highlights = arr(b.highlights, 3)
    .map((h) => ({ icon: HIGHLIGHT_ICONS.includes(h?.icon) ? h.icon : 'bed', title: text(h?.title, 30), subtitle: text(h?.subtitle, 30) }))
    .filter((h) => h.title)
  hotel.gallery = arr(b.gallery, 60)
    .map((g) => ({ url: text(g?.url, 500), category: text(g?.category, 30) || 'Exterior' }))
    .filter((g) => g.url)
  hotel.spaces = arr(b.spaces, 20)
    .map((s) => ({ name: text(s?.name, 40), details: text(s?.details, 120), image: text(s?.image, 500) }))
    .filter((s) => s.name)

  try {
    await hotel.save()
  } catch (err) {
    if (err?.name === 'ValidationError') throw badRequest(Object.values(err.errors)[0]?.message || 'Invalid details')
    throw err
  }
  res.json({ success: true, message: 'Villa details saved', data: view(hotel.toObject()) })
}
