import crypto from 'crypto'
import { env } from '../../../config/env.js'

export const OTP_TTL_MS = 5 * 60 * 1000
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000
export const OTP_MAX_ATTEMPTS = 5

// Demo mode (default): every number gets this fixed code and no SMS is sent.
// Real mode (OTP_MODE=real): random code per request, delivered through sendSms().
const DEMO_OTP = '123456'
export const isRealOtp = () => env.otpMode === 'real'

// "+91 98765-43210" -> "+919876543210", so one number maps to one account
export function normalizePhone(value) {
  const raw = String(value || '').trim()
  const digits = raw.replace(/\D/g, '')
  return raw.startsWith('+') ? `+${digits}` : digits
}

export const isValidPhone = (phone) => phone.replace(/\D/g, '').length >= 10

export const generateOtp = () => (isRealOtp() ? String(crypto.randomInt(100000, 1000000)) : DEMO_OTP)

// Only the hash is stored, never the code itself
export const hashOtp = (otp) => crypto.createHmac('sha256', env.jwtAccessSecret).update(String(otp)).digest('hex')

export function otpMatches(otp, storedHash) {
  const a = Buffer.from(hashOtp(otp))
  const b = Buffer.from(String(storedHash || ''))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Plug an SMS provider (Twilio, MSG91, ...) in here. Only called in real mode.
export async function sendSms(phone, otp) {
  throw new Error(`SMS provider not configured; cannot send OTP to ${phone}`)
}
