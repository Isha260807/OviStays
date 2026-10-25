import mongoose from 'mongoose'
import { codePlugin } from '../../../utils/codePlugin.js'
import { IMAGE_PATH_PATTERN, IMAGE_PATH_MESSAGE } from '../../../utils/uploadPaths.js'

export const GENDERS = ['', 'Male', 'Female', 'Other']
export const MAX_GUESTS = 20

// Guest / customer account.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: 'Guest Traveler' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    phoneVerified: { type: Boolean, default: false },
    photo: { type: String, trim: true, default: '', match: [new RegExp(IMAGE_PATH_PATTERN.source + '|^$'), IMAGE_PATH_MESSAGE] },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }], // favourite villas, oldest first
    dob: { type: Date },
    gender: { type: String, enum: GENDERS, default: '' },
    // People the guest books for often; the booking form can fill from here
    guests: [{ name: { type: String, required: true, trim: true, maxlength: 50 }, phone: { type: String, required: true, trim: true, maxlength: 20 }, email: { type: String, trim: true, lowercase: true, default: '', maxlength: 100 } }],
    passwordHash: { type: String, select: false },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    otp: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpSentAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
)

// One account per phone number (users without a phone are left out)
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $gt: '' } } })

userSchema.plugin(codePlugin, { prefix: 'CU' })

export default mongoose.models.User || mongoose.model('User', userSchema)
