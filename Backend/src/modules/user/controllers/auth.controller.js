import User from '../models/User.model.js'
import Settings from '../../../models/Settings.model.js'
import { signAccessToken } from '../../../core/auth/token.util.js'
import { ROLES } from '../../../core/roles/roles.js'
import { badRequest, HttpError } from '../../../utils/httpError.js'
import {
  OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS,
  generateOtp, hashOtp, isRealOtp, isValidPhone, normalizePhone, otpMatches, sendSms,
} from '../services/otp.service.js'

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
  await user.save()

  const token = signAccessToken({ id: String(user._id), role: ROLES.USER }, '30d')

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
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

  let extra
  try {
    extra = await issueOtp(user)
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, 'An account with this number already exists. Please log in.')
    throw err
  }
  res.json({ success: true, message: 'Account created! Verification OTP sent.', data: otpResponse(phone, extra) })
}

// Current logged in user info
export async function me(req, res) {
  const user = await User.findById(req.auth.id)
  if (!user || user.status !== 'Active') {
    throw new HttpError(401, 'User session invalid or expired')
  }
  res.json({ success: true, data: publicUser(user) })
}
