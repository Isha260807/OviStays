import User from '../models/User.model.js'
import Settings from '../../../models/Settings.model.js'
import { signAccessToken } from '../../../core/auth/token.util.js'
import { ROLES } from '../../../core/roles/roles.js'
import { badRequest, HttpError } from '../../../utils/httpError.js'

const publicUser = (u) => ({
  _id: u._id,
  refId: u.refId,
  name: u.name,
  email: u.email,
  phone: u.phone,
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

// Send or resend OTP to a phone number
export async function sendOtp(req, res) {
  const phone = String(req.body.phone || '').trim()
  if (!phone || phone.length < 10) {
    throw badRequest('Please enter a valid 10-digit mobile number')
  }

  // Generate 6-digit OTP (for dev / demo, 123456 is standard fallback or random 6-digit)
  const otp = '123456'
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  let user = await User.findOne({ phone }).select('+otp +otpExpiresAt')
  if (!user) {
    user = new User({
      phone,
      name: req.body.name?.trim() || 'Guest Traveler',
      email: req.body.email?.trim().toLowerCase() || '',
    })
  } else if (req.body.name) {
    user.name = req.body.name.trim()
    if (req.body.email) user.email = req.body.email.trim().toLowerCase()
  }

  user.otp = otp
  user.otpExpiresAt = otpExpiresAt
  await user.save()

  res.json({
    success: true,
    message: `OTP sent successfully to ${phone}`,
    data: {
      phone,
      demoOtp: otp, // convenient for preview / testing
      expiresInSeconds: 300,
    },
  })
}

// Verify OTP and issue JWT session
export async function verifyOtp(req, res) {
  const phone = String(req.body.phone || '').trim()
  const otp = String(req.body.otp || '').trim()

  if (!phone || !otp) {
    throw badRequest('Phone number and OTP are required')
  }

  const user = await User.findOne({ phone }).select('+otp +otpExpiresAt')
  if (!user) {
    throw new HttpError(404, 'User not found. Please request a new OTP.')
  }

  // Check OTP match (allow '123456' as master bypass for easy testing or exact match)
  const isMatch = otp === '123456' || (user.otp && user.otp === otp)
  if (!isMatch) {
    throw badRequest('Invalid OTP. Please check and try again.')
  }

  if (user.otpExpiresAt && new Date() > user.otpExpiresAt && otp !== '123456') {
    throw badRequest('OTP has expired. Please request a new one.')
  }

  // Clear OTP
  user.otp = undefined
  user.otpExpiresAt = undefined
  await user.save()

  if (user.status !== 'Active') {
    throw new HttpError(403, 'Your account is suspended. Please contact support.')
  }

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

// Register new user
export async function register(req, res) {
  const { name, phone, email } = req.body
  if (!name || !phone) {
    throw badRequest('Name and phone number are required')
  }

  let user = await User.findOne({ phone }).select('+otp +otpExpiresAt')
  if (!user) {
    user = new User({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : '',
    })
  } else {
    user.name = name.trim()
    if (email) user.email = email.trim().toLowerCase()
  }

  const otp = '123456'
  user.otp = otp
  user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000)
  await user.save()

  res.json({
    success: true,
    message: 'Account created! Verification OTP sent.',
    data: {
      phone: user.phone,
      demoOtp: otp,
    },
  })
}

// Current logged in user info
export async function me(req, res) {
  const user = await User.findById(req.auth.id)
  if (!user || user.status !== 'Active') {
    throw new HttpError(401, 'User session invalid or expired')
  }
  res.json({ success: true, data: publicUser(user) })
}
