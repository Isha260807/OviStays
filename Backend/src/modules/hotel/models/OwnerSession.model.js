import mongoose from 'mongoose'

// One signed-in device of an owner. Same idea as UserSession: only the hash of the refresh token is stored.
const sessionSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true, index: true },
    tokenHash: { type: String, required: true },
    prevTokenHash: { type: String, default: '' },
    prevValidUntil: { type: Date },
    userAgent: { type: String, default: '', maxlength: 300 },
    ip: { type: String, default: '' },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
)
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.OwnerSession || mongoose.model('OwnerSession', sessionSchema)
