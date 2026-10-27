import mongoose from 'mongoose'

export const BLOCK_TYPES = ['booking', 'hold', 'owner_block']

// The one authoritative calendar of a villa. Every night stay, day-use package, hourly slot, temporary hold
// and owner block is a row here, stored as a time interval [startAt, endAt). Two rows conflict whenever
// their intervals (plus the turnover buffer) overlap, whatever booking mode created them.
const blockSchema = new mongoose.Schema(
  {
    villa: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', index: true },
    type: { type: String, enum: BLOCK_TYPES, required: true },
    mode: { type: String, enum: ['day', 'night', 'fullDayNight', 'weekly', 'monthly', 'dayUse', 'hourly', 'manual'], default: 'manual' },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    // endAt plus the cleaning / turnover buffer: nobody else can start before this instant
    blockedUntil: { type: Date, required: true },
    // Holds lapse by themselves at this time; confirmed bookings and owner blocks have none
    expiresAt: { type: Date, default: null },
    reason: { type: String, trim: true, default: '', maxlength: 200 },
    released: { type: Boolean, default: false },
  },
  { timestamps: true }
)

blockSchema.index({ villa: 1, startAt: 1, blockedUntil: 1 })
blockSchema.index({ booking: 1 }, { sparse: true })
blockSchema.index({ released: 1, updatedAt: 1 })

export default mongoose.models.AvailabilityBlock || mongoose.model('AvailabilityBlock', blockSchema)
