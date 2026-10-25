import mongoose from 'mongoose'
import { IMAGE_PATH_PATTERN, IMAGE_PATH_MESSAGE } from '../utils/uploadPaths.js'

// The user Home page is built from these sections, in this default order.
// categories / reels / weekend carry their own items; the others pick Hotels, a Banner + Coupon, or one Hotel.
export const HOME_SECTION_KEYS = [
  'categories', 'popular', 'promo', 'bestDeals', 'reels',
  'poolVillas', 'weekend', 'hills', 'offerOfDay', 'beachside',
]

const image = { type: String, trim: true, default: '', match: [new RegExp(`${IMAGE_PATH_PATTERN.source}|^$`), IMAGE_PATH_MESSAGE] }
const ref = (model) => ({ type: mongoose.Schema.Types.ObjectId, ref: model, default: null })

const sectionSchema = new mongoose.Schema(
  {
    key: { type: String, enum: HOME_SECTION_KEYS, required: true },
    enabled: { type: Boolean, default: true },
    title: { type: String, trim: true, default: '', maxlength: 80 },
    subtitle: { type: String, trim: true, default: '', maxlength: 120 },

    hotels: [ref('Hotel')], // popular, bestDeals, poolVillas, hills, beachside
    hotel: ref('Hotel'), // offerOfDay
    promos: [{ banner: ref('Banner'), coupon: ref('Coupon'), _id: false }], // promo
    banner: ref('Banner'), // old single promo, read only until the section is saved again
    coupon: ref('Coupon'),

    // weekend: a Location city, a photo and a one-line description
    tiles: [{ city: { type: String, trim: true, default: '' }, image, tagline: { type: String, trim: true, default: '', maxlength: 80 }, _id: false }],

    // reels: short clips, optionally linked to a Hotel
    reels: [{
      title: { type: String, trim: true, default: '', maxlength: 40 },
      video: { type: String, trim: true, default: '' },
      poster: image,
      hotel: ref('Hotel'),
      duration: { type: Number, default: 6, min: 2, max: 30 },
      _id: false,
    }],

    // categories: round photos; each links to the villa list filtered by its label
    categories: [{ label: { type: String, trim: true, default: '', maxlength: 30 }, image, _id: false }],
  },
  { _id: false }
)

const heroDefaults = {
  image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1400&q=70',
  eyebrow: 'Find your perfect villa',
  line1: 'Relax.',
  line2: 'Unwind.',
  line3: 'Feel at home.',
  subtitle: 'Private villas, exceptional comfort.',
}

const unsplash = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=300&q=80`

export const DEFAULT_SECTIONS = [
  {
    key: 'categories',
    categories: [
      { label: 'Beach', image: unsplash('1499793983690-e29da59ef1c2') },
      { label: 'Pool', image: unsplash('1602343168117-bb8ffe3e2e9f') },
      { label: 'Hills', image: unsplash('1506905925346-21bda4d32df4') },
      { label: 'Winter', image: unsplash('1518780664697-55e3ad937233') },
      { label: 'Farmhouse', image: unsplash('1564013799919-ab600027ffc6') },
      { label: 'City', image: unsplash('1613977257363-707ba9348227') },
    ],
  },
  { key: 'popular', title: 'Popular Destinations' },
  { key: 'promo' },
  { key: 'bestDeals', title: 'Best Deals' },
  { key: 'reels', title: 'Villa Vibes', subtitle: 'quick tours, just a few seconds each' },
  { key: 'poolVillas', title: 'Private Pool Villas' },
  { key: 'weekend', title: 'Weekend Getaways!' },
  { key: 'hills', title: 'Hill Retreats' },
  { key: 'offerOfDay', title: 'Offer of the Day!' },
  { key: 'beachside', title: 'Beachside Villas' },
]

// Single document holding the user Home page layout (Admin > Home Management > Home Page Design).
const homePageSchema = new mongoose.Schema(
  {
    hero: {
      image: { ...image, default: heroDefaults.image },
      eyebrow: { type: String, trim: true, default: heroDefaults.eyebrow, maxlength: 60 },
      line1: { type: String, trim: true, default: heroDefaults.line1, maxlength: 30 },
      line2: { type: String, trim: true, default: heroDefaults.line2, maxlength: 30 },
      line3: { type: String, trim: true, default: heroDefaults.line3, maxlength: 30 },
      subtitle: { type: String, trim: true, default: heroDefaults.subtitle, maxlength: 120 },
    },
    sections: { type: [sectionSchema], default: () => DEFAULT_SECTIONS },
  },
  { timestamps: true }
)

homePageSchema.statics.get = async function () {
  return (await this.findOne()) || (await this.create({}))
}

export default mongoose.models.HomePage || mongoose.model('HomePage', homePageSchema)
