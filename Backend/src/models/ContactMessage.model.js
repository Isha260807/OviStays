import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Unread', 'Read'], default: 'Unread', index: true },
  },
  { timestamps: true }
)

contactMessageSchema.plugin(codePlugin, { prefix: 'MS' })

export default mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactMessageSchema)
