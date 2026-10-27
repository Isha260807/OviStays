import mongoose from 'mongoose'

// Webhook events already handled. The unique eventId makes a repeated delivery harmless.
const eventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, default: '' },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)
eventSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 })

export default mongoose.models.PaymentEvent || mongoose.model('PaymentEvent', eventSchema)
