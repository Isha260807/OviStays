import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

const couponSchema = new mongoose.Schema(
  {
    couponCode: { type: String, required: true, trim: true, uppercase: true, unique: true },
    discountType: { type: String, enum: ['percent', 'flat'], default: 'percent' },
    discountValue: { type: Number, required: true, min: 0 },
    validTill: { type: Date, required: true },
    usedCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['Active', 'Inactive', 'Expired'], default: 'Active', index: true },
  },
  { timestamps: true }
)

couponSchema.plugin(codePlugin, { prefix: 'CP' })

export default mongoose.models.Coupon || mongoose.model('Coupon', couponSchema)
