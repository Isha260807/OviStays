import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    bookingCode: { type: String, default: '' },
    guestName: { type: String, default: '' },
    method: { type: String, enum: ['UPI', 'Card', 'Net Banking', 'Wallet', 'Cash'], default: 'UPI' },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Paid', 'Pending', 'Failed', 'Refunded'], default: 'Pending', index: true },
  },
  { timestamps: true }
)

paymentSchema.plugin(codePlugin, { prefix: 'PY' })

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema)
