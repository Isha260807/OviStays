import mongoose from 'mongoose'
import Hotel from '../../../models/Hotel.model.js'
import Amenity from '../../../models/Amenity.model.js'
import Review from '../../../models/Review.model.js'
import { notFound } from '../../../utils/httpError.js'

// Public data for the villa details page. Only Active villas are visible.

const REVIEWS_SHOWN = 30

async function reviewBlock(hotelId) {
  const published = { hotel: hotelId, status: 'Published' }
  const [items, dist] = await Promise.all([
    Review.find(published).sort({ createdAt: -1 }).limit(REVIEWS_SHOWN).lean(),
    Review.aggregate([{ $match: published }, { $group: { _id: '$rating', n: { $sum: 1 } } }]),
  ])
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const d of dist) distribution[d._id] = d.n
  const count = Object.values(distribution).reduce((a, b) => a + b, 0)
  const total = Object.entries(distribution).reduce((sum, [stars, n]) => sum + Number(stars) * n, 0)
  return {
    average: count ? Math.round((total / count) * 10) / 10 : 0,
    count,
    distribution,
    items: items.map((r) => ({
      id: String(r._id),
      name: r.guestName,
      rating: r.rating,
      comment: r.comment || '',
      date: r.createdAt,
      verified: Boolean(r.user), // written by a signed-in guest
    })),
  }
}

// Cards need something even when the admin set no highlights: derive them from the numbers
const derivedHighlights = (h) => [
  h.bedrooms && { icon: 'bed', title: `${h.bedrooms} Bedroom${h.bedrooms > 1 ? 's' : ''}`, subtitle: 'Private rooms' },
  h.maxGuests && { icon: 'guests', title: `${h.maxGuests} Guests`, subtitle: 'Maximum' },
  h.bathrooms && { icon: 'bath', title: `${h.bathrooms} Bathroom${h.bathrooms > 1 ? 's' : ''}`, subtitle: 'Attached' },
].filter(Boolean)

export async function getVilla(req, res) {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) throw notFound('Villa not found')
  const h = await Hotel.findOne({ _id: id, status: 'Active' }).lean()
  if (!h) throw notFound('Villa not found')

  const [amenities, reviews] = await Promise.all([
    h.amenities?.length ? Amenity.find({ _id: { $in: h.amenities }, status: 'Active' }).lean() : [],
    reviewBlock(h._id),
  ])
  const order = new Map((h.amenities || []).map((a, i) => [String(a), i]))
  amenities.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)))

  // The cover photo leads the gallery unless the admin already included it
  const photos = [...(h.gallery || [])]
  if (h.coverImage && !photos.some((p) => p.url === h.coverImage)) photos.unshift({ url: h.coverImage, category: 'Exterior' })

  res.json({
    success: true,
    data: {
      id: String(h._id),
      name: h.name,
      propertyType: h.propertyType || 'Private Villa',
      city: h.city,
      location: [h.address, h.city, h.state].filter(Boolean).join(', ') || h.city,
      rating: reviews.count ? reviews.average : h.rating || 0,
      reviewCount: reviews.count,
      price: h.startingPrice || 0,
      bedrooms: h.bedrooms || 0,
      bathrooms: h.bathrooms || 0,
      maxGuests: h.maxGuests || 0,
      description: h.description || '',
      video: h.videoUrl || '',
      photos,
      highlights: h.highlights?.length ? h.highlights : derivedHighlights(h),
      amenities: amenities.map((a) => ({ id: String(a._id), name: a.name, category: a.category })),
      spaces: h.spaces || [],
      policies: {
        checkIn: h.checkInTime || '',
        checkOut: h.checkOutTime || '',
        cancellation: h.cancellationPolicy || '',
        payment: h.paymentInfo || '',
      },
      mapUrl: h.mapUrl || '',
      reviews,
    },
  })
}
