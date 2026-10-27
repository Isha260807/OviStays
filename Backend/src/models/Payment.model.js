import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

const paise = { type: Number, default: 0, min: 0, validate: { validator: Number.isInteger, message: 'Amounts must be whole paise' } }

// One gateway payment for one booking. `history` only ever grows, so every step stays traceable.
const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    bookingCode: { type: String, default: '' },
    guestName: { type: String, default: '' },
    method: { type: String, enum: ['UPI', 'Card', 'Net Banking', 'Wallet', 'Cash'], default: 'UPI' },
    // Legacy rupee amount used by reports (always amountPaise / 100)
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Created', 'Paid', 'Pending', 'Failed', 'Refunded', 'Partially Refunded'], default: 'Pending', index: true },

    provider: { type: String, enum: ['razorpay', 'mock', 'manual'], default: 'manual' },
    amountPaise: paise,
    currency: { type: String, default: 'INR' },
    orderId: { type: String, default: undefined },
    gatewayPaymentId: { type: String, default: undefined },
    paidAt: Date,
    refundedPaise: paise,
    refunds: {
      type: [{
        key: { type: String, required: true }, // idempotency key, one per booking
        amountPaise: paise,
        status: { type: String, enum: ['Pending', 'Processed', 'Failed'], default: 'Pending' },
        gatewayRefundId: { type: String, default: '' },
        reason: { type: String, default: '' },
        attempts: { type: Number, default: 0 },
        lastError: { type: String, default: '' },
        requestedAt: { type: Date, default: Date.now },
        processedAt: Date,
        _id: false,
      }],
      default: [],
    },
    history: {
      type: [{ at: { type: Date, default: Date.now }, event: String, note: { type: String, default: '' }, _id: false }],
      default: [],
    },
  },
  { timestamps: true }
)

paymentSchema.plugin(codePlugin, { prefix: 'PY' })
// A gateway order or payment id can belong to one record only
paymentSchema.index({ orderId: 1 }, { unique: true, partialFilterExpression: { orderId: { $type: 'string' } } })
paymentSchema.index({ gatewayPaymentId: 1 }, { unique: true, partialFilterExpression: { gatewayPaymentId: { $type: 'string' } } })

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema)
