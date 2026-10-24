import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

const amenitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    category: { type: String, enum: ['Basic', 'Comfort', 'Wellness', 'Dining'], default: 'Basic' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
)

amenitySchema.plugin(codePlugin, { prefix: 'AM' })

export default mongoose.models.Amenity || mongoose.model('Amenity', amenitySchema)
