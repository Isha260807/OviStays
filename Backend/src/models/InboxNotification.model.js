import mongoose from 'mongoose'

const INBOX_DAYS = 90

// A notification in one person's inbox (a guest or a hotel). The guest and hotel apps read these.
const inboxSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ['USER', 'HOTEL', 'OWNER'], required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, default: '', trim: true },
    category: { type: String, default: 'broadcast' },
    broadcast: { type: mongoose.Schema.Types.ObjectId, ref: 'BroadcastNotification', index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

inboxSchema.index({ ownerType: 1, ownerId: 1, createdAt: -1 })
inboxSchema.index({ createdAt: 1 }, { expireAfterSeconds: INBOX_DAYS * 24 * 60 * 60 })

export default mongoose.models.InboxNotification || mongoose.model('InboxNotification', inboxSchema)
