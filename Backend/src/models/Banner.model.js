import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    position: { type: String, enum: ['Home Top', 'Home Middle', 'Search Page'], default: 'Home Top' },
    imageUrl: { type: String, trim: true, default: '' },
    validTill: { type: Date },
    status: { type: String, enum: ['Active', 'Draft'], default: 'Draft', index: true },
  },
  { timestamps: true }
)

bannerSchema.plugin(codePlugin, { prefix: 'BN' })

export default mongoose.models.Banner || mongoose.model('Banner', bannerSchema)
