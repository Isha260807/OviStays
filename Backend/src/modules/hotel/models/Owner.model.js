import mongoose from 'mongoose'
import { codePlugin } from '../../../utils/codePlugin.js'
import { IMAGE_PATH_PATTERN, IMAGE_PATH_MESSAGE } from '../../../utils/uploadPaths.js'

export const KYC_STATUSES = ['Not Submitted', 'Submitted', 'Verified', 'Rejected']
export const OWNER_STATUSES = ['Active', 'Inactive', 'Suspended']

// A villa owner (host). One owner can run many villas; every villa points back through ownerId.
const ownerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    phoneVerified: { type: Boolean, default: false },
    businessName: { type: String, trim: true, default: '', maxlength: 100 },
    photo: { type: String, trim: true, default: '', match: [new RegExp(IMAGE_PATH_PATTERN.source + '|^$'), IMAGE_PATH_MESSAGE] },
    // Where the owner lives or runs the business from (used on invoices and payouts)
    address: {
      line: { type: String, trim: true, default: '', maxlength: 200 },
      city: { type: String, trim: true, default: '', maxlength: 60 },
      state: { type: String, trim: true, default: '', maxlength: 60 },
      pincode: { type: String, trim: true, default: '', maxlength: 10 },
    },
    status: { type: String, enum: OWNER_STATUSES, default: 'Active', index: true },
    kyc: {
      status: { type: String, enum: KYC_STATUSES, default: 'Not Submitted', index: true },
      panNumber: { type: String, trim: true, uppercase: true, default: '' },
      panName: { type: String, trim: true, default: '' },
      gstin: { type: String, trim: true, uppercase: true, default: '' },
      documents: { type: [{ type: { type: String, trim: true, maxlength: 40 }, url: { type: String, trim: true }, _id: false }], default: [] },
      rejectReason: { type: String, default: '' },
      submittedAt: Date,
      verifiedAt: Date,
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    },
    // Payout account. Only the last 4 digits are shown back; the full number is stored encrypted.
    bank: {
      holderName: { type: String, trim: true, default: '' },
      accountNumberEnc: { type: String, default: '', select: false },
      last4: { type: String, default: '' },
      ifsc: { type: String, trim: true, uppercase: true, default: '' },
      bankName: { type: String, trim: true, default: '' },
      upi: { type: String, trim: true, default: '' },
    },
    termsAcceptedAt: Date,
    lastLoginAt: Date,
    otp: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpSentAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
)

ownerSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $gt: '' } } })
ownerSchema.plugin(codePlugin, { prefix: 'OW' })

export default mongoose.models.Owner || mongoose.model('Owner', ownerSchema)
