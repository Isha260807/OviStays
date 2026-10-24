import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'
import Settings from './Settings.model.js'

export const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled', 'Refunded']
// Statuses that count as earned revenue
export const REVENUE_STATUSES = ['Confirmed', 'Checked In', 'Checked Out']

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    guestName: { type: String, required: true, trim: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    city: { type: String, default: '', index: true },
    roomType: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType' },
    guests: { type: Number, default: 1, min: 1 },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    // Platform earnings, calculated from Settings when the booking is created
    commission: { type: Number, min: 0 },
    platformFee: { type: Number, min: 0 },
    gst: { type: Number, min: 0 },
    status: { type: String, enum: BOOKING_STATUSES, default: 'Pending', index: true },
  },
  { timestamps: true }
)

bookingSchema.plugin(codePlugin, { prefix: 'BK' })

bookingSchema.pre('validate', async function () {
  if (!this.isNew) return
  if (this.checkOut && this.checkIn && this.checkOut <= this.checkIn) {
    this.invalidate('checkOut', 'Check-out must be after check-in')
  }
  if (this.commission == null || this.platformFee == null || this.gst == null) {
    const s = await Settings.get()
    const commission = this.commission ?? Math.round((this.amount * s.commissionRate) / 100)
    const platformFee = this.platformFee ?? s.platformFee
    this.commission = commission
    this.platformFee = platformFee
    this.gst = this.gst ?? Math.round(((commission + platformFee) * s.gstRate) / 100)
  }
})

export default mongoose.models.Booking || mongoose.model('Booking', bookingSchema)
