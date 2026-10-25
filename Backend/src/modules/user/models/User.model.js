import mongoose from 'mongoose'
import { codePlugin } from '../../../utils/codePlugin.js'

// Guest / customer account.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: 'Guest Traveler' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '', index: true },
    passwordHash: { type: String, select: false },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    otp: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
)

userSchema.plugin(codePlugin, { prefix: 'CU' })

export default mongoose.models.User || mongoose.model('User', userSchema)
