import crypto from 'crypto'
import UserSession from '../models/UserSession.model.js'
import User from '../models/User.model.js'
import { signAccessToken } from '../../../core/auth/token.util.js'
import { ROLES } from '../../../core/roles/roles.js'
import { HttpError } from '../../../utils/httpError.js'

const REFRESH_DAYS = 30
const REUSE_GRACE_MS = 30 * 1000
export const ACCESS_TTL = '15m'

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex')
const newSecret = () => crypto.randomBytes(32).toString('hex')

// Refresh tokens look like "<sessionId>.<secret>"; only the hash of the secret is stored
const refreshToken = (session, secret) => `${session._id}.${secret}`

const accessToken = (user, session) =>
  signAccessToken({ id: String(user._id), role: ROLES.USER, sid: String(session._id) }, ACCESS_TTL)

const clientInfo = (req) => ({ userAgent: String(req.headers['user-agent'] || '').slice(0, 300), ip: req.ip || '' })

// Starts a session for a freshly verified login
export async function startSession(user, req) {
  const secret = newSecret()
  const session = await UserSession.create({
    user: user._id,
    tokenHash: sha256(secret),
    expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000),
    ...clientInfo(req),
  })
  return { token: accessToken(user, session), refreshToken: refreshToken(session, secret) }
}

const invalid = () => new HttpError(401, 'Session expired. Please log in again.')

// Swaps a refresh token for a new access + refresh token pair (the old refresh token stops working)
export async function refreshSession(raw, req) {
  const [id, secret] = String(raw || '').split('.')
  if (!id || !secret || !/^[a-f\d]{24}$/i.test(id)) throw invalid()

  const session = await UserSession.findById(id)
  if (!session || session.revokedAt || session.expiresAt <= new Date()) throw invalid()

  const hash = sha256(secret)
  const current = hash === session.tokenHash
  const justRotated = hash === session.prevTokenHash && session.prevValidUntil > new Date()
  if (!current && !justRotated) {
    // An old token came back: it may have been copied, so end this session
    session.revokedAt = new Date()
    await session.save()
    throw invalid()
  }

  const user = await User.findById(session.user)
  if (!user || user.status !== 'Active') throw invalid()

  const nextSecret = newSecret()
  session.prevTokenHash = session.tokenHash
  session.prevValidUntil = new Date(Date.now() + REUSE_GRACE_MS)
  session.tokenHash = sha256(nextSecret)
  session.lastUsedAt = new Date()
  session.expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
  Object.assign(session, clientInfo(req))
  await session.save()

  return { token: accessToken(user, session), refreshToken: refreshToken(session, nextSecret) }
}

// Logs out the device that owns this refresh token (quietly ignores one that is unknown)
export async function endSession(raw) {
  const [id, secret] = String(raw || '').split('.')
  if (!id || !secret || !/^[a-f\d]{24}$/i.test(id)) return
  await UserSession.updateOne({ _id: id, tokenHash: sha256(secret), revokedAt: null }, { revokedAt: new Date() })
}

export const endAllSessions = (userId, exceptId) =>
  UserSession.updateMany({ user: userId, revokedAt: null, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }, { revokedAt: new Date() })

// "Chrome on Windows" from a user-agent string
export function deviceLabel(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown device'
  return `${browser} on ${os}`
}

export async function listSessions(userId, currentId) {
  const sessions = await UserSession.find({ user: userId, revokedAt: null, expiresAt: { $gt: new Date() } }).sort({ lastUsedAt: -1 }).lean()
  return sessions.map((s) => ({
    id: String(s._id),
    device: deviceLabel(s.userAgent),
    ip: s.ip,
    lastUsedAt: s.lastUsedAt,
    createdAt: s.createdAt,
    current: String(s._id) === String(currentId),
  }))
}

// Route guard: the token must belong to a session that is still signed in (so logging out takes effect at once)
export async function requireActiveSession(req, res, next) {
  const sid = req.auth?.sid
  const ok = sid && /^[a-f\d]{24}$/i.test(sid) && (await UserSession.exists({ _id: sid, user: req.auth.id, revokedAt: null, expiresAt: { $gt: new Date() } }))
  if (!ok) return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' })
  next()
}
