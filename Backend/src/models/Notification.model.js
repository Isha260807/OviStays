import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

// Broadcast message log. Actual push delivery (FCM etc.) is not wired up yet.
const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true, default: '' },
    audience: { type: String, enum: ['All Users', 'Users', 'Hotels'], default: 'All Users' },
    sentAt: { type: Date },
    status: { type: String, enum: ['Sent', 'Scheduled'], default: 'Sent', index: true },
  },
  { timestamps: true }
)

notificationSchema.plugin(codePlugin, { prefix: 'NT' })

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema)
