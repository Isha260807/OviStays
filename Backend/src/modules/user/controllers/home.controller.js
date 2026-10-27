import HomePage from '../../../models/HomePage.model.js'
import Location from '../../../models/Location.model.js'
import Hotel from '../../../models/Hotel.model.js'
import Banner from '../../../models/Banner.model.js'
import Coupon from '../../../models/Coupon.model.js'
import Review from '../../../models/Review.model.js'

// Public data for the user Home page: the saved layout with every reference resolved.
// A section with nothing to show (no active villas, expired coupon, ...) is left out.

export const villaCard = (h) => ({
  id: String(h._id),
  name: h.name,
  city: h.city,
  location: [h.address, h.city, h.state].filter(Boolean).join(', ') || h.city,
  rating: h.rating || 0,
  price: h.startingPrice || 0,
  image: h.coverImage || '',
  rooms: h.rooms || 0,
})

// Active hotels for a list of ids, kept in the order the admin chose
async function hotelsByIds(idList) {
  if (!idList?.length) return []
  const docs = await Hotel.find({ _id: { $in: idList }, status: 'Active' }).lean()
  const byId = new Map(docs.map((d) => [String(d._id), d]))
  return idList.map((i) => byId.get(String(i))).filter(Boolean).map(villaCard)
}

// "Hill Stations" -> "hill-stations"

const discountText = (c) => (c.discountType === 'percent' ? `${c.discountValue}%` : `₹${Number(c.discountValue).toLocaleString('en-IN')}`)

async function resolveSection(s) {
  const base = { key: s.key, title: s.title || '', subtitle: s.subtitle || '' }

  switch (s.key) {
    case 'popular':
    case 'bestDeals':
    case 'poolVillas':
    case 'hills':
    case 'beachside': {
      const items = await hotelsByIds(s.hotels)
      return items.length ? { ...base, items } : null
    }

    case 'offerOfDay': {
      const [item] = await hotelsByIds(s.hotel ? [s.hotel] : [])
      if (!item) return null
      const reviews = await Review.countDocuments({ hotel: item.id, status: 'Published' })
      return { ...base, offer: { ...item, reviews } }
    }

    case 'promo': {
      // old single promo still works until the section is saved again
      const pairs = s.promos?.length ? s.promos : s.banner && s.coupon ? [{ banner: s.banner, coupon: s.coupon }] : []
      if (!pairs.length) return null
      const now = new Date()
      const [banners, coupons] = await Promise.all([
        Banner.find({ _id: { $in: pairs.map((p) => p.banner) }, status: 'Active', $or: [{ validTill: null }, { validTill: { $exists: false } }, { validTill: { $gte: now } }] }).lean(),
        Coupon.find({ _id: { $in: pairs.map((p) => p.coupon) }, status: 'Active', validTill: { $gte: now } }).lean(),
      ])
      const bannerById = new Map(banners.map((x) => [String(x._id), x]))
      const couponById = new Map(coupons.map((x) => [String(x._id), x]))
      const promos = pairs
        .map((p) => ({ banner: bannerById.get(String(p.banner)), coupon: couponById.get(String(p.coupon)) }))
        .filter((p) => p.banner?.imageUrl && p.coupon)
        .map((p, i) => ({ id: `promo-${i}`, image: p.banner.imageUrl, title: `Extra ${discountText(p.coupon)} Off`, line: p.banner.title, code: p.coupon.couponCode }))
      return promos.length ? { ...base, promos } : null
    }

    case 'weekend': {
      const tiles = s.tiles || []
      if (!tiles.length) return null
      const cities = tiles.map((t) => t.city)
      const prices = await Hotel.aggregate([
        { $match: { status: 'Active', city: { $in: cities } } },
        { $group: { _id: '$city', price: { $min: '$startingPrice' } } },
      ])
      const priceOf = Object.fromEntries(prices.map((p) => [p._id, p.price]))
      const out = tiles
        .filter((t) => t.image && priceOf[t.city] !== undefined) // a tile needs a photo and at least one active villa in the city
        .map((t, i) => ({ id: `${i}-${t.city}`, city: t.city, tagline: t.tagline || '', price: priceOf[t.city], image: t.image }))
      return out.length ? { ...base, tiles: out } : null
    }

    case 'reels': {
      const list = s.reels || []
      if (!list.length) return null
      const hotelIds = list.map((r) => r.hotel).filter(Boolean)
      const hotels = new Map((await hotelsByIds(hotelIds)).map((h) => [h.id, h]))
      const out = list.map((r, i) => {
        const h = r.hotel ? hotels.get(String(r.hotel)) : null
        return {
          id: `reel-${i}`,
          title: r.title,
          video: r.video || '',
          image: r.poster || h?.image || '',
          duration: r.duration || 6,
          ...(h ? { villa: h.name, villaId: h.id, city: h.city, price: h.price } : {}),
        }
      })
      return { ...base, reels: out }
    }

    case 'categories': {
      // Round tiles are the locations the admin added, with the photo the admin uploaded; without one
      // the best-rated active villa in the city lends its cover photo, and a city with neither is skipped
      const [locations, rows] = await Promise.all([
        Location.find({ status: 'Active' }).sort({ createdAt: 1 }).lean(),
        Hotel.aggregate([
          { $match: { status: 'Active', coverImage: { $nin: ['', null] } } },
          { $sort: { rating: -1 } },
          { $group: { _id: { $toLower: '$city' }, image: { $first: '$coverImage' } } },
        ]),
      ])
      const imageOf = new Map(rows.map((r) => [r._id, r.image]))
      const list = locations
        .map((l) => ({ label: l.city, image: l.image || imageOf.get(l.city.toLowerCase()), to: `/villas?city=${encodeURIComponent(l.city)}` }))
        .filter((l) => l.image)
      return list.length ? { ...base, categories: list } : null
    }

    default:
      return null
  }
}

export async function getHome(req, res) {
  const page = await HomePage.get()
  const sections = (await Promise.all((page.sections || []).filter((s) => s.enabled).map((s) => resolveSection(s.toObject())))).filter(Boolean)
  res.json({ success: true, data: { hero: page.hero.toObject(), sections } })
}
