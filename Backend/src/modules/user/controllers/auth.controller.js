import User from '../models/User.model.js'
import Settings from '../../../models/Settings.model.js'
import UserSession from '../models/UserSession.model.js'
import { badRequest, HttpError } from '../../../utils/httpError.js'
import {
  OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS,
  generateOtp, hashOtp, isRealOtp, isValidPhone, normalizePhone, otpMatches, sendSms,
} from '../services/otp.service.js'
import { endAllSessions, endSession, listSessions, refreshSession, startSession } from '../services/session.service.js'

export const TERMS_VERSION = '1.0'

const publicUser = (u) => ({
  _id: u._id,
  refId: u.refId,
  name: u.name,
  email: u.email,
  phone: u.phone,
  photo: u.photo || '',
  status: u.status,
  createdAt: u.createdAt,
})

// Public auth configuration & dynamic assets (images, titles, badges)
export async function getAuthConfig(req, res) {
  const settings = await Settings.get()
  const defaults = {
    welcomeTravelerImage: '/assets/auth/traveler_hero.png',
    welcomeCard1: '/assets/auth/card_beach.jpg',
    welcomeCard2: '/assets/auth/card_pool.jpg',
    welcomeCard3: '/assets/auth/card_patio.jpg',
    authHeroBanner: '/assets/auth/hotel_hero.jpg',
    tagText: '#Luxury',
    welcomeTitle: 'Find your perfect stay anywhere in the world',
    welcomeSubtitle: 'Find and book exceptional private villas with a seamless and reliable booking experience.',
    authTagline: 'Your Dream Villa Awaits.',
    authSubtagline: 'Book private villas and enjoy comfortable stays with family & friends at great prices.',
  }

  const assets = {
    ...defaults,
    ...(settings.authAssets ? settings.authAssets.toObject?.() || settings.authAssets : {}),
  }

  res.json({
    success: true,
    data: assets,
  })
}

// Stores a fresh OTP on the user and sends it (demo mode: fixed code, nothing sent)
async function issueOtp(user) {
  const otp = generateOtp()
  user.otp = hashOtp(otp)
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS)
  user.otpSentAt = new Date()
  user.otpAttempts = 0
  await user.save()

  if (isRealOtp()) {
    await sendSms(user.phone, otp)
    return {}
  }
  return { demoOtp: otp }
}

const otpResponse = (phone, extra) => ({ phone, expiresInSeconds: OTP_TTL_MS / 1000, ...extra })

function readPhone(body) {
  const phone = normalizePhone(body.phone)
  if (!isValidPhone(phone)) throw badRequest('Please enter a valid 10-digit mobile number')
  return phone
}

function assertCanSend(user) {
  if (user.status !== 'Active') throw new HttpError(403, 'This account is not active. Please contact support.')
  if (isRealOtp() && user.otpSentAt && Date.now() - user.otpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new HttpError(429, 'Please wait a few seconds before requesting another OTP.')
  }
}

// Login / resend: send an OTP to an existing account
export async function sendOtp(req, res) {
  const phone = readPhone(req.body)

  const user = await User.findOne({ phone }).select('+otpSentAt')
  if (!user) throw new HttpError(404, 'No account found with this number. Please sign up first.')
  assertCanSend(user)

  const extra = await issueOtp(user)
  res.json({ success: true, message: `OTP sent successfully to ${phone}`, data: otpResponse(phone, extra) })
}

// Verify OTP and issue JWT session
export async function verifyOtp(req, res) {
  const phone = readPhone(req.body)
  const otp = String(req.body.otp || '').trim()
  if (!otp) throw badRequest('Phone number and OTP are required')

  const user = await User.findOne({ phone }).select('+otp +otpExpiresAt +otpAttempts')
  if (!user || !user.otp) throw badRequest('No OTP requested for this number. Please request a new one.')
  if (user.status !== 'Active') throw new HttpError(403, 'This account is not active. Please contact support.')

  if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
    throw new HttpError(429, 'Too many wrong attempts. Please request a new OTP.')
  }
  if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
    throw badRequest('OTP has expired. Please request a new one.')
  }
  if (!otpMatches(otp, user.otp)) {
    user.otpAttempts += 1
    await user.save()
    throw badRequest('Invalid OTP. Please check and try again.')
  }

  user.otp = undefined
  user.otpExpiresAt = undefined
  user.otpAttempts = 0
  user.phoneVerified = true
  user.lastLoginAt = new Date()
  await user.save()

  const { token, refreshToken } = await startSession(user, req)

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      refreshToken,
      user: publicUser(user),
    },
  })
}

// Register new user (counts as verified once the OTP is confirmed)
export async function register(req, res) {
  const name = String(req.body.name || '').trim()
  if (!name) throw badRequest('Name and phone number are required')
  const phone = readPhone(req.body)
  const email = String(req.body.email || '').trim().toLowerCase()
  if (req.body.acceptTerms !== true) throw badRequest('Please accept the Terms & Conditions and Privacy Policy to continue')

  const settings = await Settings.get()
  if (!settings.userRegistration) throw new HttpError(403, 'New sign-ups are paused right now. Please try again later.')

  let user = await User.findOne({ phone }).select('+otpSentAt')
  if (user?.phoneVerified) {
    throw new HttpError(409, 'An account with this number already exists. Please log in.')
  }
  if (user) {
    // Earlier signup that was never verified, so the details can be replaced
    user.name = name
    if (email) user.email = email
  } else {
    user = new User({ name, phone, email })
  }
  assertCanSend(user)
  user.termsAcceptedAt = new Date()
  user.termsVersion = TERMS_VERSION

  let extra
  try {
    extra = await issueOtp(user)
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, 'An account with this number already exists. Please log in.')
    throw err
  }
  res.json({ success: true, message: 'Account created! Verification OTP sent.', data: otpResponse(phone, extra) })
}

// Swap the refresh token for a new access + refresh token pair
export async function refresh(req, res) {
  const tokens = await refreshSession(req.body?.refreshToken, req)
  res.json({ success: true, data: tokens })
}

// Log out this device
export async function logout(req, res) {
  await endSession(req.body?.refreshToken)
  res.json({ success: true, message: 'Logged out' })
}

// Log out every device (or every other device with { others: true })
export async function logoutAll(req, res) {
  await endAllSessions(req.auth.id, req.body?.others ? req.auth.sid : undefined)
  res.json({ success: true, message: req.body?.others ? 'Logged out of all other devices' : 'Logged out of all devices' })
}

export async function sessions(req, res) {
  res.json({ success: true, data: await listSessions(req.auth.id, req.auth.sid) })
}

export async function revokeSession(req, res) {
  const result = await UserSession.updateOne({ _id: req.params.sessionId, user: req.auth.id, revokedAt: null }, { revokedAt: new Date() })
  if (!result.matchedCount) throw new HttpError(404, 'Device not found')
  res.json({ success: true })
}

// Current logged in user info
export async function me(req, res) {
  const user = await User.findById(req.auth.id)
  if (!user || user.status !== 'Active') {
    throw new HttpError(401, 'User session invalid or expired')
  }
  res.json({ success: true, data: publicUser(user) })
}
