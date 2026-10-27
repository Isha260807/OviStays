import crypto from 'crypto'
import OwnerSession from '../models/OwnerSession.model.js'
import Owner from '../models/Owner.model.js'
import { signAccessToken } from '../../../core/auth/token.util.js'
import { ROLES } from '../../../core/roles/roles.js'
import { HttpError } from '../../../utils/httpError.js'

// Owner sign-in sessions: a 15 minute access token plus a rotating 30 day refresh token ("<sessionId>.<secret>").
// Same scheme as guest sessions; only the hash of the secret is stored.
const REFRESH_DAYS = 30
const REUSE_GRACE_MS = 30 * 1000
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex')
const newSecret = () => crypto.randomBytes(32).toString('hex')
const access = (owner, session) => signAccessToken({ id: String(owner._id), role: ROLES.HOTEL, sid: String(session._id) }, '15m')
const invalid = () => new HttpError(401, 'Session expired. Please log in again.')
const info = (req) => ({ userAgent: String(req.headers['user-agent'] || '').slice(0, 300), ip: req.ip || '' })

export async function startSession(owner, req) {
  const secret = newSecret()
  const session = await OwnerSession.create({ owner: owner._id, tokenHash: sha256(secret), expiresAt: new Date(Date.now() + REFRESH_DAYS * 86400000), ...info(req) })
  return { token: access(owner, session), refreshToken: `${session._id}.${secret}` }
}

export async function refreshSession(raw, req) {
  const [id, secret] = String(raw || '').split('.')
  if (!id || !secret || !/^[a-f\d]{24}$/i.test(id)) throw invalid()
  const session = await OwnerSession.findById(id)
  if (!session || session.revokedAt || session.expiresAt <= new Date()) throw invalid()

  const hash = sha256(secret)
  const current = hash === session.tokenHash
  const justRotated = hash === session.prevTokenHash && session.prevValidUntil > new Date()
  if (!current && !justRotated) {
    session.revokedAt = new Date()
    await session.save()
    throw invalid()
  }
  const owner = await Owner.findById(session.owner)
  if (!owner || owner.status !== 'Active') throw invalid()

  const next = newSecret()
  session.prevTokenHash = session.tokenHash
  session.prevValidUntil = new Date(Date.now() + REUSE_GRACE_MS)
  session.tokenHash = sha256(next)
  session.lastUsedAt = new Date()
  session.expiresAt = new Date(Date.now() + REFRESH_DAYS * 86400000)
  Object.assign(session, info(req))
  await session.save()
  return { token: access(owner, session), refreshToken: `${session._id}.${next}` }
}

export async function endSession(raw) {
  const [id, secret] = String(raw || '').split('.')
  if (!id || !secret || !/^[a-f\d]{24}$/i.test(id)) return
  await OwnerSession.updateOne({ _id: id, tokenHash: sha256(secret), revokedAt: null }, { revokedAt: new Date() })
}

export const endAllSessions = (ownerId) => OwnerSession.updateMany({ owner: ownerId, revokedAt: null }, { revokedAt: new Date() })

// Guard for every signed-in owner route: the session must still be active and the owner account usable.
// Loads the owner as req.owner. The id always comes from the token, never from the request.
export async function requireOwner(req, res, next) {
  const sid = req.auth?.sid
  const ok = sid && /^[a-f\d]{24}$/i.test(sid) && (await OwnerSession.exists({ _id: sid, owner: req.auth.id, revokedAt: null, expiresAt: { $gt: new Date() } }))
  if (!ok) return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' })
  const owner = await Owner.findById(req.auth.id)
  if (!owner || owner.status !== 'Active') return res.status(403).json({ success: false, message: 'This account is not active. Please contact support.' })
  req.owner = owner
  next()
}

// Everything except the profile / KYC pages needs an owner whose documents an admin has approved.
// Until then the owner can only see their profile and the review status.
export function requireVerifiedOwner(req, res, next) {
  if (req.owner.kyc?.status === 'Verified') return next()
  const status = req.owner.kyc?.status || 'Not Submitted'
  const message = status === 'Submitted' ? 'Your documents are under review. You can use the panel once an admin approves them.'
    : status === 'Rejected' ? 'Your documents were not approved. Please fix them on your profile and submit again.'
    : 'Submit your documents on your profile to start using the host panel.'
  res.status(403).json({ success: false, code: 'KYC_REQUIRED', kycStatus: status, message })
}
