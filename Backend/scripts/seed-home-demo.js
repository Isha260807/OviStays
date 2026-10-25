// Adds demo villas, locations, a banner and a coupon, and fills the Home page sections with them,
// so the user Home page has something to show. Safe to run again: records are matched by name/code
// and are not duplicated. Existing Home page headings and the hero are left alone.
// Usage: npm run seed:home-demo
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'
import Hotel from '../src/models/Hotel.model.js'
import Location from '../src/models/Location.model.js'
import Banner from '../src/models/Banner.model.js'
import Coupon from '../src/models/Coupon.model.js'
import HomePage from '../src/models/HomePage.model.js'
import Amenity from '../src/models/Amenity.model.js'
import Review from '../src/models/Review.model.js'
import { recalcHotelRating } from '../src/utils/hotelRating.js'

const photo = (id, w = 1000) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`
const OWNER = 'OviStays Demo'

const VILLAS = [
  { key: 'lakeview', name: 'Lakeview Haveli Villa', city: 'Udaipur', state: 'Rajasthan', rooms: 5, startingPrice: 12999, rating: 4.8, image: photo('1613977257363-707ba9348227') },
  { key: 'azure', name: 'Azure Beach Villa', city: 'Goa', state: 'Goa', rooms: 4, startingPrice: 9499, rating: 4.7, image: photo('1499793983690-e29da59ef1c2') },
  { key: 'pine', name: 'Pine Ridge Villa', city: 'Manali', state: 'Himachal Pradesh', rooms: 3, startingPrice: 6999, rating: 4.6, image: photo('1506905925346-21bda4d32df4') },
  { key: 'palm', name: 'Palm Grove Villa', city: 'Alibaug', state: 'Maharashtra', rooms: 5, startingPrice: 8499, rating: 4.5, image: photo('1512917774080-9991f1c4c750') },
  { key: 'misty', name: 'Misty Hills Villa', city: 'Mussoorie', state: 'Uttarakhand', rooms: 3, startingPrice: 5000, rating: 5, image: photo('1564013799919-ab600027ffc6') },
  { key: 'sunset', name: 'Sunset Ridge Villa', city: 'Manali', state: 'Himachal Pradesh', rooms: 4, startingPrice: 4200, rating: 4, image: photo('1600596542815-ffad4c1539a9') },
  { key: 'cedar', name: 'Cedar Nest Villa', city: 'Mussoorie', state: 'Uttarakhand', rooms: 3, startingPrice: 5600, rating: 5, image: photo('1600585154340-be6161a56a0c') },
  { key: 'lagoon', name: 'Blue Lagoon Villa', city: 'Lonavala', state: 'Maharashtra', rooms: 4, startingPrice: 11999, rating: 4.7, image: photo('1602343168117-bb8ffe3e2e9f') },
  { key: 'retreat', name: 'Palm Retreat Villa', city: 'Alibaug', state: 'Maharashtra', rooms: 5, startingPrice: 14999, rating: 4.6, image: photo('1540541338287-41700207dee6') },
  { key: 'infinity', name: 'Infinity Edge Villa', city: 'Goa', state: 'Goa', rooms: 6, startingPrice: 17999, rating: 4.9, image: photo('1520250497591-112f2f40a3f4') },
  { key: 'snowline', name: 'Snowline Villa', city: 'Manali', state: 'Himachal Pradesh', rooms: 3, startingPrice: 5200, rating: 5, image: photo('1518780664697-55e3ad937233') },
  { key: 'shore', name: 'Shore House Villa', city: 'Goa', state: 'Goa', rooms: 4, startingPrice: 3999, rating: 5, image: photo('1580587771525-78b9dba3b914') },
  { key: 'dune', name: 'Dune Villa', city: 'Goa', state: 'Goa', rooms: 3, startingPrice: 4499, rating: 5, image: photo('1571003123894-1f0594d2b5d9') },
  { key: 'signature', name: 'Ovi Signature Villa', city: 'Lonavala', state: 'Maharashtra', rooms: 6, startingPrice: 30000, rating: 4.8, image: photo('1613490493576-7fde63acd811', 1200) },
]

await connectDB()

// Locations
for (const [city, state] of [['Udaipur', 'Rajasthan'], ['Goa', 'Goa'], ['Manali', 'Himachal Pradesh'], ['Alibaug', 'Maharashtra'], ['Mussoorie', 'Uttarakhand'], ['Lonavala', 'Maharashtra']]) {
  if (!(await Location.findOne({ city }))) await Location.create({ city, state })
}

// Villas
const villa = {}
for (const v of VILLAS) {
  let doc = await Hotel.findOne({ name: v.name, owner: OWNER })
  if (!doc) {
    doc = await Hotel.create({
      name: v.name, owner: OWNER, city: v.city, state: v.state, rooms: v.rooms, startingPrice: v.startingPrice,
      rating: v.rating, coverImage: v.image, status: 'Active',
      description: `A private villa in ${v.city} for family and friends.`,
    })
  }
  villa[v.key] = doc
}

// Banner + coupon for the promo section
const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
let banner = await Banner.findOne({ title: 'On your first villa booking' })
if (!banner) {
  banner = await Banner.create({ title: 'On your first villa booking', position: 'Home Middle', imageUrl: photo('1600607687939-ce8a6c25118c', 1200), validTill: nextYear, status: 'Active' })
}
let coupon = await Coupon.findOne({ couponCode: 'WELCOME20' })
if (!coupon) coupon = await Coupon.create({ couponCode: 'WELCOME20', discountType: 'percent', discountValue: 20, validTill: nextYear, status: 'Active' })

// Home page sections
const ids = (...keys) => keys.map((k) => villa[k]._id)
const fill = {
  popular: { hotels: ids('lakeview', 'azure', 'pine', 'palm') },
  promo: { promos: [{ banner: banner._id, coupon: coupon._id }] },
  bestDeals: { hotels: ids('misty', 'sunset', 'cedar') },
  poolVillas: { hotels: ids('lagoon', 'retreat', 'infinity') },
  weekend: {
    tiles: [
      { city: 'Lonavala', tagline: 'Hill-view villas near Mumbai', image: photo('1439066615861-d1af74d74000') },
      { city: 'Goa', tagline: 'Beach villas with private pools', image: photo('1499793983690-e29da59ef1c2') },
      { city: 'Manali', tagline: 'Cosy cottages in the mountains', image: photo('1506905925346-21bda4d32df4') },
    ],
  },
  hills: { hotels: ids('misty', 'snowline', 'pine') },
  offerOfDay: { hotel: villa.signature._id },
  beachside: { hotels: ids('shore', 'dune', 'azure') },
  reels: {
    reels: [
      { title: 'Pool Party', poster: photo('1600585154340-be6161a56a0c', 700), hotel: villa.lagoon._id, duration: 6 },
      { title: 'Sunset Deck', poster: photo('1499793983690-e29da59ef1c2', 700), hotel: villa.azure._id, duration: 6 },
      { title: 'Hill Views', poster: photo('1506905925346-21bda4d32df4', 700), hotel: villa.pine._id, duration: 6 },
      { title: 'Cosy Rooms', poster: photo('1578683010236-d716f9a3f461', 700), hotel: villa.misty._id, duration: 6 },
    ],
  },
}

const page = await HomePage.get()
// Only sections that are still empty get demo content, so changes made in the admin are never overwritten
const isEmpty = (v) => (Array.isArray(v) ? v.length === 0 : !v)
for (const section of page.sections) {
  const patch = fill[section.key]
  if (patch && Object.keys(patch).every((k) => isEmpty(section[k]) && isEmpty(section.promos))) Object.assign(section, patch)
}
await page.save()

// Villa details page: amenities, gallery, highlights, rooms, policies and a few reviews
const AMENITIES = [['Swimming Pool', 'Wellness'], ['Restaurant', 'Dining'], ['Free WiFi', 'Basic'], ['Parking', 'Basic'], ['Room Service', 'Comfort'], ['Air Conditioning', 'Comfort'], ['Kitchen', 'Dining'], ['TV', 'Comfort']]
const amenityDocs = []
for (const [name, category] of AMENITIES) {
  amenityDocs.push((await Amenity.findOne({ name })) || (await Amenity.create({ name, category })))
}

const GALLERY = [
  ['Exterior', photo('1613490493576-7fde63acd811')],
  ['Rooms & Suites', photo('1578683010236-d716f9a3f461')],
  ['Rooms & Suites', photo('1600607687939-ce8a6c25118c')],
  ['Pool', photo('1602343168117-bb8ffe3e2e9f')],
  ['Garden', photo('1519225421980-715cb0215aed')],
  ['Dining', photo('1464366400600-7168b8af9bc3')],
]
const REVIEWS = [
  ['Priya Malhotra', 5, 'Absolutely magical stay! The views were stunning and the villa was spotless. Our kids loved the pool.'],
  ['Rahul Verma', 5, 'Best luxury property in the area. The caretaker was helpful and the breakfast was excellent.'],
  ['Ananya Deshmukh', 4, 'Great ambience and well-kept rooms. Will definitely come back on our next trip.'],
]

for (const v of VILLAS) {
  const h = villa[v.key]
  if (!h.gallery?.length) {
    h.set({
      bedrooms: v.rooms,
      bathrooms: v.rooms,
      maxGuests: v.rooms * 2 + 2,
      amenities: amenityDocs.map((a) => a._id),
      highlights: [
        { icon: 'bed', title: v.rooms + ' BHK', subtitle: 'Private rooms' },
        { icon: 'wifi', title: 'Free WiFi', subtitle: 'Available' },
        { icon: 'parking', title: 'Free Parking', subtitle: 'Available' },
      ],
      gallery: [{ url: v.image, category: 'Exterior' }, ...GALLERY.slice(1).map(([category, url]) => ({ url, category }))],
      spaces: [
        { name: 'Master Bedroom', details: '1 King bed · 350 sq.ft · AC', image: photo('1578683010236-d716f9a3f461', 600) },
        { name: 'Living Lounge', details: 'Seating for 8 · Garden view', image: photo('1600607687939-ce8a6c25118c', 600) },
      ],
      description: 'This private villa in ' + v.city + ' offers a perfect blend of luxury, comfort and modern amenities. Enjoy the whole villa with your family and friends, with spacious rooms, a well-kept garden and a caretaker on call.',
      cancellationPolicy: 'Free up to 24 hrs',
      paymentInfo: 'Cards, UPI, Net Banking',
    })
    await h.save()
  }
  if (!(await Review.countDocuments({ hotel: h._id })) && ['lakeview', 'azure', 'pine', 'palm'].includes(v.key)) {
    for (const [guestName, rating, comment] of REVIEWS) {
      await Review.create({ hotel: h._id, hotelName: h.name, guestName, rating, comment, status: 'Published' })
    }
    await recalcHotelRating(h._id)
  }
}

console.log(`Demo data ready: ${VILLAS.length} villas, 6 locations, 1 banner, coupon WELCOME20, Home page sections filled.`)
await mongoose.disconnect()
