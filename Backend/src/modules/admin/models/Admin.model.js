import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { codePlugin } from '../../../utils/codePlugin.js'

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['ADMIN', 'SUB_ADMIN'], default: 'SUB_ADMIN', index: true },
    designation: { type: String, enum: ['Support', 'Finance', 'Content', 'Operations'], default: 'Support' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
)

adminSchema.plugin(codePlugin, { prefix: 'AD' })

adminSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 10)
adminSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

export default mongoose.models.Admin || mongoose.model('Admin', adminSchema)
