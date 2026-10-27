import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'
import Settings from './Settings.model.js'

// Pending is the old status of bookings an admin keyed in by hand; the booking flow uses the others.
export const BOOKING_STATUSES = [
  'Pending', 'Requested', 'Awaiting Payment', 'Confirmed', 'Checked In', 'Checked Out',
  'Cancelled', 'Refunded', 'Rejected', 'Expired', 'Payment Failed', 'No Show',
]
// Statuses that count as earned revenue
export const REVENUE_STATUSES = ['Confirmed', 'Checked In', 'Checked Out', 'No Show']
// Statuses that keep the villa's calendar blocked
export const LIVE_STATUSES = ['Requested', 'Awaiting Payment', 'Confirmed', 'Checked In']
export const BOOKING_MODES = ['night', 'dayUse', 'hourly']
export const PAYMENT_STATUSES = ['Unpaid', 'Paid', 'Failed', 'Refund Pending', 'Partially Refunded', 'Refunded']

const paise = { type: Number, default: 0, min: 0, validate: { validator: Number.isInteger, message: 'Amounts must be whole paise' } }

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    guestName: { type: String, required: true, trim: true },
    guestPhone: { type: String, trim: true, default: '' },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', index: true },
    city: { type: String, default: '', index: true },
    roomType: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType' },
    guests: { type: Number, default: 1, min: 1 },
    // checkIn / checkOut are the real start and end instants of the stay or slot
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    mode: { type: String, enum: BOOKING_MODES },
    slot: {
      packageId: { type: mongoose.Schema.Types.ObjectId },
      packageName: { type: String, default: '' },
      durationMinutes: { type: Number, default: 0 },
      date: { type: String, default: '' },
    },
    timezone: { type: String, default: 'Asia/Kolkata' },
    confirmationMode: { type: String, enum: ['instant', 'request'] },

    // Legacy rupee fields kept for reports; the paise values in `pricing` are the source of truth
    amount: { type: Number, required: true, min: 0 },
    commission: { type: Number, min: 0 },
    platformFee: { type: Number, min: 0 },
    gst: { type: Number, min: 0 },
    pricing: {
      lines: { type: [{ label: String, amountPaise: Number, _id: false }], default: undefined },
      nights: { type: Number, default: 0 },
      roomPaise: paise,
      discountPaise: paise,
      couponCode: { type: String, default: '' },
      couponPaise: paise,
      cleaningFeePaise: paise,
      taxPaise: paise,
      totalPaise: paise,
      commissionPaise: paise,
      platformFeePaise: paise,
      commissionGstPaise: paise,
      ownerPayoutPaise: paise,
    },

    status: { type: String, enum: BOOKING_STATUSES, default: 'Pending', index: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'Unpaid' },
    requestedAt: Date,
    ownerResponseDueAt: Date, // request-to-book: the owner must answer before this
    payBy: Date, // the guest must pay before this
    holdExpiresAt: Date, // when the calendar hold lapses
    confirmedAt: Date,
    checkedInAt: Date,
    checkedOutAt: Date,
    checkInCode: { type: String, select: false },
    checkInAttempts: { type: Number, default: 0, select: false },
    checkInLockedUntil: { type: Date, select: false },
    rejectReason: { type: String, default: '' },
    cancellation: {
      by: { type: String, enum: ['guest', 'owner', 'admin', 'system'] },
      reason: { type: String, default: '' },
      at: Date,
      refundPercent: { type: Number, min: 0, max: 100 },
      refundPaise: paise,
    },
    idempotencyKey: { type: String, default: undefined },
    history: {
      type: [{ at: { type: Date, default: Date.now }, status: String, by: String, note: { type: String, default: '' }, _id: false }],
      default: [],
    },
  },
  { timestamps: true }
)

bookingSchema.plugin(codePlugin, { prefix: 'BK' })
bookingSchema.index({ hotel: 1, status: 1, checkIn: 1 })
bookingSchema.index({ ownerId: 1, status: 1, checkIn: 1 })
bookingSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } })
bookingSchema.index({ status: 1, ownerResponseDueAt: 1 })
bookingSchema.index({ status: 1, holdExpiresAt: 1 })

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
