import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

const roomTypeSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, default: 2, min: 1 },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
)

roomTypeSchema.plugin(codePlugin, { prefix: 'RT' })

export default mongoose.models.RoomType || mongoose.model('RoomType', roomTypeSchema)
