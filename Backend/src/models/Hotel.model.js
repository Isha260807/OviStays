import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

export const HOTEL_STATUSES = ['Active', 'Pending', 'Suspended']

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
    rooms: { type: Number, default: 0, min: 0 },
    startingPrice: { type: Number, default: 0, min: 0 },
    checkInTime: { type: String, default: '12:00' },
    checkOutTime: { type: String, default: '11:00' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    status: { type: String, enum: HOTEL_STATUSES, default: 'Pending', index: true },
  },
  { timestamps: true }
)

hotelSchema.plugin(codePlugin, { prefix: 'HT' })

export default mongoose.models.Hotel || mongoose.model('Hotel', hotelSchema)
