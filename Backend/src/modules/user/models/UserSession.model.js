import mongoose from 'mongoose'

// One signed-in device. The refresh token itself is never stored, only its hash.
const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    // The token before the last refresh stays valid for a few seconds so two tabs refreshing together do not log each other out
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

// Expired sessions clean themselves up
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.UserSession || mongoose.model('UserSession', sessionSchema)
