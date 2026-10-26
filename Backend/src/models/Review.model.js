import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    guestName: { type: String, required: true, trim: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }, // set when a guest reviews a finished stay
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['Published', 'Pending', 'Hidden'], default: 'Pending', index: true },
  },
  { timestamps: true }
)

reviewSchema.plugin(codePlugin, { prefix: 'RV' })

// One review per booking
reviewSchema.index({ booking: 1 }, { unique: true, partialFilterExpression: { booking: { $exists: true } } })

export default mongoose.models.Review || mongoose.model('Review', reviewSchema)
