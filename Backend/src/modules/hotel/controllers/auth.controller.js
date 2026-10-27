import Owner from '../models/Owner.model.js'
import Settings from '../../../models/Settings.model.js'
import { badRequest, HttpError } from '../../../utils/httpError.js'
import {
  OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS,
  generateOtp, hashOtp, isRealOtp, isValidPhone, normalizePhone, otpMatches, sendSms,
} from '../../user/services/otp.service.js'
import { endAllSessions, endSession, refreshSession, startSession } from '../services/session.service.js'

// Owner login uses the same mobile-number OTP scheme as guests.

export const publicOwner = (o) => ({
  id: String(o._id),
  refId: o.refId,
  name: o.name,
  email: o.email,
  phone: o.phone,
  businessName: o.businessName,
  photo: o.photo || '',
  status: o.status,
  kycStatus: o.kyc?.status || 'Not Submitted',
  createdAt: o.createdAt,
})

const readPhone = (body) => {
  const phone = normalizePhone(body.phone)
  if (!isValidPhone(phone)) throw badRequest('Please enter a valid 10-digit mobile number')
  return phone
}
const otpResponse = (phone, extra) => ({ phone, expiresInSeconds: OTP_TTL_MS / 1000, ...extra })

function assertCanSend(owner) {
  if (owner.status !== 'Active') throw new HttpError(403, 'This account is not active. Please contact support.')
  if (isRealOtp() && owner.otpSentAt && Date.now() - owner.otpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new HttpError(429, 'Please wait a few seconds before requesting another OTP.')
  }
}

async function issueOtp(owner) {
  const otp = generateOtp()
  owner.otp = hashOtp(otp)
  owner.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS)
  owner.otpSentAt = new Date()
  owner.otpAttempts = 0
  await owner.save()
  if (isRealOtp()) {
    await sendSms(owner.phone, otp)
    return {}
  }
  return { demoOtp: otp }
}

// POST /hotel/auth/register   { name, phone, email?, businessName?, acceptTerms }
export async function register(req, res) {
  const name = String(req.body.name || '').trim()
  if (name.length < 2) throw badRequest('Please enter your name')
  const phone = readPhone(req.body)
  const email = String(req.body.email || '').trim().toLowerCase()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Please enter a valid email address')
  if (req.body.acceptTerms !== true) throw badRequest('Please accept the Terms & Conditions to continue')
  const settings = await Settings.get()
  if (!settings.hotelRegistration) throw new HttpError(403, 'New owner sign-ups are paused right now. Please try again later.')

  let owner = await Owner.findOne({ phone }).select('+otpSentAt')
  if (owner?.phoneVerified) throw new HttpError(409, 'An account with this number already exists. Please log in.')
  if (owner) {
    owner.name = name
    if (email) owner.email = email
  } else {
    owner = new Owner({ name, phone, email })
  }
  owner.businessName = String(req.body.businessName || '').trim().slice(0, 100)
  owner.termsAcceptedAt = new Date()
  assertCanSend(owner)
  let extra
  try {
    extra = await issueOtp(owner)
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, 'An account with this number already exists. Please log in.')
    throw err
  }
  res.json({ success: true, message: 'Verification OTP sent.', data: otpResponse(phone, extra) })
}

// POST /hotel/auth/send-otp   { phone }
export async function sendOtp(req, res) {
  const phone = readPhone(req.body)
  const owner = await Owner.findOne({ phone }).select('+otpSentAt')
  if (!owner || !owner.phoneVerified) throw new HttpError(404, 'No owner account found with this number. Please sign up first.')
  assertCanSend(owner)
  const extra = await issueOtp(owner)
  res.json({ success: true, message: `OTP sent successfully to ${phone}`, data: otpResponse(phone, extra) })
}

// POST /hotel/auth/verify-otp   { phone, otp }
export async function verifyOtp(req, res) {
  const phone = readPhone(req.body)
  const otp = String(req.body.otp || '').trim()
  if (!otp) throw badRequest('Phone number and OTP are required')
  const owner = await Owner.findOne({ phone }).select('+otp +otpExpiresAt +otpAttempts')
  if (!owner || !owner.otp) throw badRequest('No OTP requested for this number. Please request a new one.')
  if (owner.status !== 'Active') throw new HttpError(403, 'This account is not active. Please contact support.')
  if (owner.otpAttempts >= OTP_MAX_ATTEMPTS) throw new HttpError(429, 'Too many wrong attempts. Please request a new OTP.')
  if (!owner.otpExpiresAt || new Date() > owner.otpExpiresAt) throw badRequest('OTP has expired. Please request a new one.')
  if (!otpMatches(otp, owner.otp)) {
    owner.otpAttempts += 1
    await owner.save()
    throw badRequest('Invalid OTP. Please check and try again.')
  }
  owner.otp = undefined
  owner.otpExpiresAt = undefined
  owner.otpAttempts = 0
  owner.phoneVerified = true
  owner.lastLoginAt = new Date()
  await owner.save()
  const tokens = await startSession(owner, req)
  res.json({ success: true, message: 'Login successful', data: { ...tokens, owner: publicOwner(owner) } })
}

export async function refresh(req, res) {
  res.json({ success: true, data: await refreshSession(req.body?.refreshToken, req) })
}

export async function logout(req, res) {
  await endSession(req.body?.refreshToken)
  res.json({ success: true, message: 'Logged out' })
}

export async function logoutAll(req, res) {
  await endAllSessions(req.owner._id)
  res.json({ success: true, message: 'Logged out of all devices' })
}

export async function me(req, res) {
  res.json({ success: true, data: publicOwner(req.owner) })
}
