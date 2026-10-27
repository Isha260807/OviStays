import mongoose from 'mongoose'
import Owner from '../../hotel/models/Owner.model.js'
import Hotel from '../../../models/Hotel.model.js'
import Booking, { LIVE_STATUSES } from '../../../models/Booking.model.js'
import Payment from '../../../models/Payment.model.js'
import AuditLog, { audit } from '../../../models/AuditLog.model.js'
import { HttpError, badRequest, notFound } from '../../../utils/httpError.js'
import { notifyOwner } from '../../../core/notifications/notify.service.js'
import { cancelBooking } from '../../user/services/booking.service.js'
import { endAllSessions } from '../../hotel/services/session.service.js'

// Admin side of the owner / villa / booking marketplace: KYC review, villa approval, suspensions and
// admin-initiated cancellations. Every decision is written to the audit log.

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const validId = (id, what) => {
  if (!mongoose.isValidObjectId(id)) throw notFound(`${what} not found`)
  return id
}
const page = (q) => ({ page: Math.max(1, parseInt(q.page, 10) || 1), limit: Math.min(100, Math.max(1, parseInt(q.limit, 10) || 10)) })

const ownerRow = (o, villas = 0) => ({
  id: String(o._id), refId: o.refId, name: o.name, phone: o.phone, email: o.email, businessName: o.businessName, status: o.status,
  kycStatus: o.kyc?.status, villas, createdAt: o.createdAt,
})

// GET /admin/owners?status=&kyc=&search=&page=
export async function listOwners(req, res) {
  const { page: p, limit } = page(req.query)
  const filter = {}
  if (req.query.status) filter.status = String(req.query.status)
  if (req.query.kyc) filter['kyc.status'] = String(req.query.kyc)
  const search = String(req.query.search || '').trim()
  if (search) {
    const rx = new RegExp(escapeRx(search), 'i')
    filter.$or = [{ refId: rx }, { name: rx }, { phone: rx }, { email: rx }, { businessName: rx }]
  }
  const [items, total] = await Promise.all([Owner.find(filter).sort({ createdAt: -1 }).skip((p - 1) * limit).limit(limit), Owner.countDocuments(filter)])
  const counts = await Hotel.aggregate([{ $match: { ownerId: { $in: items.map((o) => o._id) } } }, { $group: { _id: '$ownerId', n: { $sum: 1 } } }])
  const byOwner = new Map(counts.map((c) => [String(c._id), c.n]))
  res.json({ success: true, data: { items: items.map((o) => ownerRow(o, byOwner.get(String(o._id)) || 0)), total, page: p, pages: Math.max(1, Math.ceil(total / limit)) } })
}

export async function getOwner(req, res) {
  const o = await Owner.findById(validId(req.params.id, 'Owner'))
  if (!o) throw notFound('Owner not found')
  const villas = await Hotel.find({ ownerId: o._id }).select('name city listingStatus status refId').lean()
  res.json({
    success: true,
    data: {
      ...ownerRow(o, villas.length),
      kyc: { status: o.kyc.status, panNumber: o.kyc.panNumber, panName: o.kyc.panName, gstin: o.kyc.gstin, documents: o.kyc.documents, rejectReason: o.kyc.rejectReason, submittedAt: o.kyc.submittedAt, verifiedAt: o.kyc.verifiedAt },
      bank: { holderName: o.bank?.holderName, last4: o.bank?.last4, ifsc: o.bank?.ifsc, bankName: o.bank?.bankName, upi: o.bank?.upi },
      villaList: villas.map((v) => ({ id: String(v._id), refId: v.refId, name: v.name, city: v.city, listingStatus: v.listingStatus })),
    },
  })
}

// POST /admin/owners/:id/kyc   { action: 'verify' | 'reject', reason? }
export async function reviewKyc(req, res) {
  const o = await Owner.findById(validId(req.params.id, 'Owner'))
  if (!o) throw notFound('Owner not found')
  const { action } = req.body || {}
  const reason = String(req.body?.reason || '').trim().slice(0, 300)
  if (o.kyc.status !== 'Submitted') throw new HttpError(409, 'This owner has no KYC waiting for review')
  if (action === 'verify') {
    o.kyc.status = 'Verified'
    o.kyc.verifiedAt = new Date()
    o.kyc.verifiedBy = req.auth.id
    o.kyc.rejectReason = ''
  } else if (action === 'reject') {
    if (!reason) throw badRequest('Please give a reason so the owner can fix it')
    o.kyc.status = 'Rejected'
    o.kyc.rejectReason = reason
  } else throw badRequest('Action must be verify or reject')
  await o.save()
  audit({ actorType: 'admin', actorId: req.auth.id, action: `owner.kyc_${action}`, targetType: 'Owner', targetId: o._id, note: reason })
  notifyOwner(o._id, action === 'verify'
    ? { title: 'KYC verified', message: 'Your account is verified. You can now submit your villas for approval.', link: '/hotel/villas', category: 'kyc' }
    : { title: 'KYC needs changes', message: `We could not verify your details: ${reason}`, link: '/hotel/profile', category: 'kyc' })
  res.json({ success: true, message: action === 'verify' ? 'Owner verified' : 'KYC rejected', data: ownerRow(o) })
}

// PATCH /admin/owners/:id/status   { status: 'Active' | 'Inactive' | 'Suspended', reason? }
export async function setOwnerStatus(req, res) {
  const o = await Owner.findById(validId(req.params.id, 'Owner'))
  if (!o) throw notFound('Owner not found')
  const status = req.body?.status
  if (!['Active', 'Inactive', 'Suspended'].includes(status)) throw badRequest('Choose Active, Inactive or Suspended')
  o.status = status
  await o.save()
  if (status !== 'Active') await endAllSessions(o._id)
  audit({ actorType: 'admin', actorId: req.auth.id, action: `owner.${status.toLowerCase()}`, targetType: 'Owner', targetId: o._id, note: String(req.body?.reason || '') })
  res.json({ success: true, data: ownerRow(o) })
}

// POST /admin/hotels/:id/listing   { action: 'approve' | 'reject' | 'suspend' | 'reinstate', reason? }
export async function reviewListing(req, res) {
  const villa = await Hotel.findById(validId(req.params.id, 'Villa'))
  if (!villa) throw notFound('Villa not found')
  const { action } = req.body || {}
  const reason = String(req.body?.reason || '').trim().slice(0, 300)
  const from = villa.listingStatus

  if (action === 'approve') {
    if (from !== 'Pending Approval') throw new HttpError(409, 'Only a villa waiting for approval can be approved')
    villa.listingStatus = 'Approved'
    villa.approvedAt = new Date()
    villa.approvedBy = req.auth.id
    villa.rejectionReason = ''
  } else if (action === 'reject') {
    if (from !== 'Pending Approval') throw new HttpError(409, 'Only a villa waiting for approval can be rejected')
    if (!reason) throw badRequest('Please give a reason so the owner can fix it')
    villa.listingStatus = 'Rejected'
    villa.rejectionReason = reason
  } else if (action === 'suspend') {
    if (from === 'Suspended') throw new HttpError(409, 'This villa is already suspended')
    if (!reason) throw badRequest('Please give a reason for the suspension')
    villa.listingStatus = 'Suspended'
    villa.rejectionReason = reason
  } else if (action === 'reinstate') {
    if (from !== 'Suspended') throw new HttpError(409, 'Only a suspended villa can be reinstated')
    villa.listingStatus = villa.approvedAt ? 'Approved' : 'Pending Approval'
    villa.rejectionReason = ''
  } else throw badRequest('Action must be approve, reject, suspend or reinstate')

  await villa.save()
  audit({ actorType: 'admin', actorId: req.auth.id, action: `villa.${action}`, targetType: 'Hotel', targetId: villa._id, note: reason, meta: { from, to: villa.listingStatus } })
  const messages = {
    approve: { title: 'Villa approved', message: `${villa.name} is now live and can take bookings.` },
    reject: { title: 'Villa needs changes', message: `${villa.name} was not approved: ${reason}` },
    suspend: { title: 'Villa suspended', message: `${villa.name} was suspended: ${reason}` },
    reinstate: { title: 'Villa reinstated', message: `${villa.name} is available again.` },
  }
  if (villa.ownerId) notifyOwner(villa.ownerId, { ...messages[action], link: `/hotel/villas/${villa._id}`, category: 'listing' })

  // Existing stays on a suspended villa are cancelled and refunded in full
  let cancelled = 0
  if (action === 'suspend' && req.body?.cancelBookings === true) {
    const live = await Booking.find({ hotel: villa._id, status: { $in: ['Requested', 'Awaiting Payment', 'Confirmed'] }, checkOut: { $gte: new Date() } }).select('_id')
    for (const b of live) {
      try {
        await cancelBooking({ bookingId: b._id, by: 'system', byId: req.auth.id, reason: 'Villa suspended' })
        cancelled++
      } catch (err) {
        console.error('Could not cancel booking on suspension:', err.message)
      }
    }
  }
  res.json({ success: true, message: `Villa ${villa.listingStatus.toLowerCase()}`, data: { id: String(villa._id), listingStatus: villa.listingStatus, status: villa.status, cancelledBookings: cancelled } })
}

// GET /admin/hotels/:id/listing   pending bookings that a suspension would touch, and the review history
export async function listingInfo(req, res) {
  const villa = await Hotel.findById(validId(req.params.id, 'Villa')).lean()
  if (!villa) throw notFound('Villa not found')
  const [live, history, owner] = await Promise.all([
    Booking.countDocuments({ hotel: villa._id, status: { $in: LIVE_STATUSES }, checkOut: { $gte: new Date() } }),
    AuditLog.find({ targetType: 'Hotel', targetId: villa._id }).sort({ createdAt: -1 }).limit(20).lean(),
    villa.ownerId ? Owner.findById(villa.ownerId).select('name phone refId kyc.status').lean() : null,
  ])
  res.json({ success: true, data: { listingStatus: villa.listingStatus, rejectionReason: villa.rejectionReason, liveBookings: live, owner, history: history.map((h) => ({ action: h.action, note: h.note, at: h.createdAt })) } })
}

// POST /admin/bookings/:id/cancel   { reason, refundPercent? }
// Cancels any live booking. refundPercent (0-100) overrides the normal refund rules, for disputes.
export async function cancelAsAdmin(req, res) {
  const id = validId(req.params.id, 'Booking')
  const reason = String(req.body?.reason || '').trim()
  if (!reason) throw badRequest('Please write the reason for this cancellation')
  let percent
  if (req.body?.refundPercent !== undefined && req.body.refundPercent !== '' && req.body.refundPercent !== null) {
    percent = Number(req.body.refundPercent)
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw badRequest('Refund percentage must be between 0 and 100')
  }
  const done = await cancelBooking({ bookingId: id, by: 'admin', byId: req.auth.id, reason, adminPercent: percent })
  res.json({ success: true, message: 'Booking cancelled', data: { id: String(done._id), status: done.status, paymentStatus: done.paymentStatus, cancellation: done.cancellation } })
}

// GET /admin/bookings/:id/payments   money trail for support
export async function bookingPayments(req, res) {
  const payments = await Payment.find({ booking: validId(req.params.id, 'Booking') }).sort({ createdAt: 1 }).lean()
  res.json({ success: true, data: payments.map((p) => ({ id: String(p._id), refId: p.refId, status: p.status, provider: p.provider, orderId: p.orderId, gatewayPaymentId: p.gatewayPaymentId, amountPaise: p.amountPaise, refundedPaise: p.refundedPaise, refunds: p.refunds, history: p.history, paidAt: p.paidAt })) })
}

// GET /admin/audit-logs?action=&target=
export async function auditLogs(req, res) {
  const { page: p, limit } = page(req.query)
  const filter = {}
  if (req.query.action) filter.action = new RegExp(`^${escapeRx(String(req.query.action))}`)
  if (req.query.target && mongoose.isValidObjectId(req.query.target)) filter.targetId = req.query.target
  const [items, total] = await Promise.all([AuditLog.find(filter).sort({ createdAt: -1 }).skip((p - 1) * limit).limit(limit).lean(), AuditLog.countDocuments(filter)])
  res.json({ success: true, data: { items: items.map((a) => ({ id: String(a._id), actorType: a.actorType, actorId: a.actorId, action: a.action, targetType: a.targetType, targetId: a.targetId, note: a.note, at: a.createdAt })), total, page: p, pages: Math.max(1, Math.ceil(total / limit)) } })
}
