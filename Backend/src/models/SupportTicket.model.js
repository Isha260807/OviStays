import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

export const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']

const supportTicketSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // set for tickets raised from the guest app
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', index: true }, // set for tickets raised from the host panel
    raisedBy: { type: String, required: true, trim: true },
    raisedByType: { type: String, enum: ['User', 'Hotel'], default: 'User' },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    status: { type: String, enum: TICKET_STATUSES, default: 'Open', index: true },
  },
  { timestamps: true }
)

supportTicketSchema.plugin(codePlugin, { prefix: 'TK' })

export default mongoose.models.SupportTicket || mongoose.model('SupportTicket', supportTicketSchema)
