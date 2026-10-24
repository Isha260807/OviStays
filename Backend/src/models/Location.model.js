import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

const locationSchema = new mongoose.Schema(
  {
    city: { type: String, required: true, trim: true, unique: true },
    state: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
)

locationSchema.plugin(codePlugin, { prefix: 'LC' })

export default mongoose.models.Location || mongoose.model('Location', locationSchema)
