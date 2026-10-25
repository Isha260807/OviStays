import mongoose from 'mongoose'
import { codePlugin } from '../../../utils/codePlugin.js'
import { IMAGE_PATH_PATTERN, IMAGE_PATH_MESSAGE } from '../../../utils/uploadPaths.js'

// Guest / customer account.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: 'Guest Traveler' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '', index: true },
    photo: { type: String, trim: true, default: '', match: [new RegExp(IMAGE_PATH_PATTERN.source + '|^$'), IMAGE_PATH_MESSAGE] },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }], // favourite villas, oldest first
    passwordHash: { type: String, select: false },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    otp: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
)

userSchema.plugin(codePlugin, { prefix: 'CU' })

export default mongoose.models.User || mongoose.model('User', userSchema)
