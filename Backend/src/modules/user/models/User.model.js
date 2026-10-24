import mongoose from 'mongoose'
import { codePlugin } from '../../../utils/codePlugin.js'

// Guest / customer account.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, trim: true, default: '' },
    passwordHash: { type: String, select: false },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
)

userSchema.plugin(codePlugin, { prefix: 'CU' })

export default mongoose.models.User || mongoose.model('User', userSchema)
