import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

const payoutSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, default: '' },
    period: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Pending', 'Processed'], default: 'Pending', index: true },
  },
  { timestamps: true }
)

payoutSchema.plugin(codePlugin, { prefix: 'PO' })

export default mongoose.models.Payout || mongoose.model('Payout', payoutSchema)
