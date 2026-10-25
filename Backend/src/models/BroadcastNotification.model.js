import mongoose from 'mongoose'

const HISTORY_DAYS = 30

const targetSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ['USER', 'HOTEL'], required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    label: { type: String, default: '', trim: true },
    subLabel: { type: String, default: '', trim: true },
  },
  { _id: false }
)

// One message sent by an admin to many people. The per-person copies live in InboxNotification.
const broadcastSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    targetType: { type: String, enum: ['ALL', 'USER', 'HOTEL', 'CUSTOM'], required: true, index: true },
    // Only kept for CUSTOM broadcasts; ALL / USER / HOTEL are resolved when sent
    targets: { type: [targetSchema], default: [] },
    link: { type: String, default: '', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    targetCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// History is cleaned up automatically
broadcastSchema.index({ createdAt: 1 }, { expireAfterSeconds: HISTORY_DAYS * 24 * 60 * 60 })

export default mongoose.models.BroadcastNotification || mongoose.model('BroadcastNotification', broadcastSchema)
