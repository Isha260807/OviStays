import mongoose from 'mongoose'
import User from '../models/User.model.js'
import Hotel from '../../../models/Hotel.model.js'
import { IMAGE_PATH_PATTERN } from '../../../utils/uploadPaths.js'
import { badRequest, HttpError } from '../../../utils/httpError.js'
import { villaCard } from './home.controller.js'
import { GENDERS, ID_TYPES, MAX_GUESTS } from '../models/User.model.js'
import {
  OTP_MAX_ATTEMPTS, OTP_TTL_MS, generateOtp, hashOtp, isRealOtp, otpMatches, sendEmail,
} from '../services/otp.service.js'
import { endAllSessions } from '../services/session.service.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[\d\s-]{7,18}$/

const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')

const profileView = (u) => ({
  _id: u._id,
  refId: u.refId,
  name: u.name,
  email: u.email,
  phone: u.phone,
  photo: u.photo || '',
  dob: ymd(u.dob),
  gender: u.gender || '',
  emailVerified: Boolean(u.email) && Boolean(u.emailVerified),
  status: u.status,
  createdAt: u.createdAt,
})

const guestView = (g) => ({ id: String(g._id), name: g.name, phone: g.phone, email: g.email || '' })

async function currentUser(req) {
  const user = await User.findById(req.auth.id)
  if (!user || user.status !== 'Active') throw new HttpError(401, 'User session invalid or expired')
  return user
}

// ---- profile ---------------------------------------------------------------------------------

export async function getProfile(req, res) {
  res.json({ success: true, data: profileView(await currentUser(req)) })
}

// The phone number is the login, so only name, email, photo, date of birth and gender can be changed here
export async function updateProfile(req, res) {
  const user = await currentUser(req)
  const b = req.body || {}

  if (b.name !== undefined) {
    const name = String(b.name).trim()
    if (name.length < 2 || name.length > 50) throw badRequest('Name must be between 2 and 50 characters')
    user.name = name
  }
  if (b.email !== undefined) {
    const email = String(b.email).trim().toLowerCase()
    if (email && !EMAIL.test(email)) throw badRequest('Please enter a valid email address')
    if (email !== user.email) user.emailVerified = false
    user.email = email
  }
  if (b.photo !== undefined) {
    const photo = String(b.photo).trim()
    if (photo && !IMAGE_PATH_PATTERN.test(photo)) throw badRequest('Photo must be an uploaded image')
    user.photo = photo
  }
  if (b.dob !== undefined) {
    const raw = String(b.dob).trim()
    if (!raw) {
      user.dob = undefined
    } else {
      const date = new Date(`${raw}T00:00:00.000Z`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(date.getTime())) throw badRequest('Please enter a valid date of birth')
      if (date > new Date() || date.getUTCFullYear() < 1900) throw badRequest('Date of birth is not valid')
      user.dob = date
    }
  }
  if (b.gender !== undefined) {
    const gender = String(b.gender).trim()
    if (!GENDERS.includes(gender)) throw badRequest('Please choose a valid gender')
    user.gender = gender
  }

  await user.save()
  res.json({ success: true, message: 'Profile updated', data: profileView(user) })
}

// Deactivates the account (the guest can no longer sign in). Bookings and reviews stay on record.
export async function deleteAccount(req, res) {
  const user = await currentUser(req)
  if (req.body?.confirm !== 'DELETE') throw badRequest('Please confirm the account deletion')
  user.status = 'Inactive'
  user.wishlist = []
  user.guests = []
  await user.save()
  await endAllSessions(user._id)
  res.json({ success: true, message: 'Your account has been deleted' })
}

// ---- saved guests ----------------------------------------------------------------------------

function cleanGuest(b = {}) {
  const name = String(b.name ?? '').trim()
  const phone = String(b.phone ?? '').trim()
  const email = String(b.email ?? '').trim().toLowerCase()
  if (name.length < 2 || name.length > 50) throw badRequest('Guest name must be between 2 and 50 characters')
  if (!PHONE.test(phone)) throw badRequest('Please enter a valid contact number')
  if (email && !EMAIL.test(email)) throw badRequest('Please enter a valid email address')
  return { name, phone, email }
}

export async function listGuests(req, res) {
  const user = await currentUser(req)
  res.json({ success: true, data: (user.guests || []).map(guestView) })
}

export async function addGuest(req, res) {
  const user = await currentUser(req)
  if ((user.guests || []).length >= MAX_GUESTS) throw badRequest(`You can save up to ${MAX_GUESTS} guests`)
  user.guests.push(cleanGuest(req.body))
  await user.save()
  res.status(201).json({ success: true, data: user.guests.map(guestView) })
}

export async function updateGuest(req, res) {
  const user = await currentUser(req)
  const guest = user.guests.id(req.params.guestId)
  if (!guest) throw new HttpError(404, 'Guest not found')
  guest.set(cleanGuest(req.body))
  await user.save()
  res.json({ success: true, data: user.guests.map(guestView) })
}

export async function removeGuest(req, res) {
  const user = await currentUser(req)
  const guest = user.guests.id(req.params.guestId)
  if (!guest) throw new HttpError(404, 'Guest not found')
  guest.deleteOne()
  await user.save()
  res.json({ success: true, data: user.guests.map(guestView) })
}

// ---- favourites ------------------------------------------------------------------------------

// Newest favourite first. `ids` lists every saved villa so hearts can be filled without loading the cards.
export async function getWishlist(req, res) {
  const user = await currentUser(req)
  const ids = (user.wishlist || []).map(String).reverse()
  const docs = ids.length ? await Hotel.find({ _id: { $in: ids }, status: 'Active' }).lean() : []
  const byId = new Map(docs.map((d) => [String(d._id), d]))
  res.json({
    success: true,
    data: { ids, items: ids.map((i) => byId.get(i)).filter(Boolean).map(villaCard) },
  })
}

async function villaIdFrom(req) {
  const id = req.params.villaId
  if (!mongoose.isValidObjectId(id)) throw badRequest('Invalid villa')
  return id
}

export async function addToWishlist(req, res) {
  const id = await villaIdFrom(req)
  const exists = await Hotel.exists({ _id: id, status: 'Active' })
  if (!exists) throw new HttpError(404, 'Villa not found')
  await User.updateOne({ _id: req.auth.id }, { $addToSet: { wishlist: id } })
  res.json({ success: true })
}

export async function removeFromWishlist(req, res) {
  const id = await villaIdFrom(req)
  await User.updateOne({ _id: req.auth.id }, { $pull: { wishlist: id } })
  res.json({ success: true })
}

// ---- email verification ----------------------------------------------------------------------

// Sends a code to the email saved on the profile (demo mode: fixed code, nothing is sent)
export async function sendEmailOtp(req, res) {
  const user = await User.findById(req.auth.id).select('+emailOtpExpiresAt')
  if (!user || user.status !== 'Active') throw new HttpError(401, 'User session invalid or expired')
  if (!user.email) throw badRequest('Add your email address first')
  if (user.emailVerified) throw badRequest('Your email is already verified')

  const otp = generateOtp()
  user.emailOtp = hashOtp(otp)
  user.emailOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS)
  user.emailOtpAttempts = 0
  await user.save()

  if (isRealOtp()) await sendEmail(user.email, otp)
  res.json({ success: true, message: `Verification code sent to ${user.email}`, data: { email: user.email, ...(isRealOtp() ? {} : { demoOtp: otp }) } })
}

export async function verifyEmailOtp(req, res) {
  const user = await User.findById(req.auth.id).select('+emailOtp +emailOtpExpiresAt +emailOtpAttempts')
  if (!user || user.status !== 'Active') throw new HttpError(401, 'User session invalid or expired')
  const otp = String(req.body.otp || '').trim()
  if (!otp) throw badRequest('Please enter the code')
  if (!user.emailOtp) throw badRequest('No code requested. Please request a new one.')
  if (user.emailOtpAttempts >= OTP_MAX_ATTEMPTS) throw new HttpError(429, 'Too many wrong attempts. Please request a new code.')
  if (!user.emailOtpExpiresAt || new Date() > user.emailOtpExpiresAt) throw badRequest('The code has expired. Please request a new one.')
  if (!otpMatches(otp, user.emailOtp)) {
    user.emailOtpAttempts += 1
    await user.save()
    throw badRequest('Invalid code. Please check and try again.')
  }

  user.emailVerified = true
  user.emailOtp = undefined
  user.emailOtpExpiresAt = undefined
  user.emailOtpAttempts = 0
  await user.save()
  res.json({ success: true, message: 'Email verified', data: profileView(user) })
}

// ---- billing and ID --------------------------------------------------------------------------

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

const billingView = (u) => ({
  business: { companyName: u.business?.companyName || '', gstin: u.business?.gstin || '', address: u.business?.address || '' },
  idProof: { type: u.idProof?.type || '', last4: u.idProof?.last4 || '', holderName: u.idProof?.holderName || '' },
})

export async function getBilling(req, res) {
  res.json({ success: true, data: billingView(await currentUser(req)) })
}

export async function updateBilling(req, res) {
  const user = await currentUser(req)
  const b = req.body || {}

  if (b.business) {
    const companyName = String(b.business.companyName ?? '').trim()
    const gstin = String(b.business.gstin ?? '').trim().toUpperCase()
    const address = String(b.business.address ?? '').trim()
    if (gstin && !GSTIN.test(gstin)) throw badRequest('Please enter a valid 15-character GSTIN')
    if (gstin && !companyName) throw badRequest('Please enter the company name for this GSTIN')
    if (companyName.length > 100) throw badRequest('Company name is too long')
    if (address.length > 250) throw badRequest('Address is too long')
    user.business = { companyName, gstin, address }
  }

  if (b.idProof) {
    const type = String(b.idProof.type ?? '').trim()
    // Only the last 4 digits are kept, so a full number typed in is cut down
    const last4 = String(b.idProof.last4 ?? '').replace(/\s/g, '').slice(-4).toUpperCase()
    const holderName = String(b.idProof.holderName ?? '').trim()
    if (!ID_TYPES.includes(type)) throw badRequest('Please choose a valid ID type')
    if (type && !/^[A-Z0-9]{4}$/.test(last4)) throw badRequest('Please enter the last 4 characters of your ID number')
    if (holderName.length > 50) throw badRequest('Name on ID is too long')
    user.idProof = type ? { type, last4, holderName } : { type: '', last4: '', holderName: '' }
  }

  await user.save()
  res.json({ success: true, message: 'Details saved', data: billingView(user) })
}

// ---- notification preferences ----------------------------------------------------------------

const PREFERENCE_KEYS = ['bookingUpdates', 'offers', 'email', 'sms', 'push']
const preferencesView = (u) => Object.fromEntries(PREFERENCE_KEYS.map((k) => [k, u.preferences?.[k] !== false]))

export async function getPreferences(req, res) {
  res.json({ success: true, data: preferencesView(await currentUser(req)) })
}

export async function updatePreferences(req, res) {
  const user = await currentUser(req)
  for (const key of PREFERENCE_KEYS) {
    if (req.body?.[key] !== undefined) user.set(`preferences.${key}`, req.body[key] === true)
  }
  await user.save()
  res.json({ success: true, message: 'Preferences saved', data: preferencesView(user) })
}
