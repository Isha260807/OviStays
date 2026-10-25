import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'
import { IMAGE_PATH_PATTERN, IMAGE_PATH_MESSAGE } from '../utils/uploadPaths.js'

export const HOTEL_STATUSES = ['Active', 'Pending', 'Suspended']
export const HIGHLIGHT_ICONS = ['bed', 'bath', 'guests', 'wifi', 'parking', 'pool', 'ac', 'kitchen']

const image = { type: String, trim: true, default: '', match: [new RegExp(IMAGE_PATH_PATTERN.source + '|^$'), IMAGE_PATH_MESSAGE] }
const maxItems = (n) => ({ validator: (v) => v.length <= n, message: 'At most ' + n + ' items allowed' })

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, required: true, trim: true, index: true },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
    coverImage: { type: String, trim: true, default: '', match: [IMAGE_PATH_PATTERN, IMAGE_PATH_MESSAGE] },
    rooms: { type: Number, default: 0, min: 0 },
    startingPrice: { type: Number, default: 0, min: 0 },
    checkInTime: { type: String, default: '12:00' },
    checkOutTime: { type: String, default: '11:00' },
    rating: { type: Number, default: 0, min: 0, max: 5 },

    // Villa details page (edited in Admin > Hotels > Edit details)
    propertyType: { type: String, trim: true, default: 'Private Villa', maxlength: 40 },
    bedrooms: { type: Number, default: 0, min: 0, max: 50 },
    bathrooms: { type: Number, default: 0, min: 0, max: 50 },
    maxGuests: { type: Number, default: 0, min: 0, max: 200 },
    gallery: { type: [{ url: image, category: { type: String, trim: true, default: 'Exterior', maxlength: 30 }, _id: false }], validate: maxItems(60) },
    amenities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Amenity' }],
    highlights: { type: [{ icon: { type: String, enum: HIGHLIGHT_ICONS, default: 'bed' }, title: { type: String, trim: true, maxlength: 30 }, subtitle: { type: String, trim: true, default: '', maxlength: 30 }, _id: false }], validate: maxItems(3) },
    spaces: { type: [{ name: { type: String, trim: true, maxlength: 40 }, details: { type: String, trim: true, default: '', maxlength: 120 }, image, _id: false }], validate: maxItems(20) },
    videoUrl: { type: String, trim: true, default: '' },
    cancellationPolicy: { type: String, trim: true, default: '', maxlength: 200 },
    paymentInfo: { type: String, trim: true, default: '', maxlength: 120 },
    mapUrl: { type: String, trim: true, default: '', match: [/^(https:\/\/\S+)?$/, 'Map link must be an https URL'] },
    status: { type: String, enum: HOTEL_STATUSES, default: 'Pending', index: true },
  },
  { timestamps: true }
)

hotelSchema.plugin(codePlugin, { prefix: 'HT' })

export default mongoose.models.Hotel || mongoose.model('Hotel', hotelSchema)
