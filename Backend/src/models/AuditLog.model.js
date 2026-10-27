import mongoose from 'mongoose'

// Who did what to which record: approvals, suspensions, refunds and other sensitive actions.
const auditSchema = new mongoose.Schema(
  {
    actorType: { type: String, enum: ['admin', 'owner', 'user', 'system'], required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, index: true },
    note: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditSchema)

// Logging must never break the action being logged
export const audit = (entry) => AuditLog.create(entry).catch((err) => console.error('Audit log failed:', err.message))

export default AuditLog
