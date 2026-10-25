import EnvSetting from '../../../models/EnvSetting.model.js'
import Booking from '../../../models/Booking.model.js'
import Payment from '../../../models/Payment.model.js'
import Payout from '../../../models/Payout.model.js'
import Review from '../../../models/Review.model.js'
import SupportTicket from '../../../models/SupportTicket.model.js'
import ContactMessage from '../../../models/ContactMessage.model.js'
import Notification from '../../../models/Notification.model.js'
import { encrypt, isEncryptionConfigured } from '../../../utils/encryption.js'
import { refreshEnv, fileEnv } from '../../../config/env.js'
import { badRequest } from '../../../utils/httpError.js'
import { getUploadProvider, setUploadProvider, isCloudinaryConfigured } from '../../../utils/cloudinary.js'
import { resolveUploadRoot } from '../../../utils/uploadPaths.js'

// ---------------------------------------------------------------- Env managements

// Variables that can be overridden from the panel. MONGO_URI and ENCRYPTION_KEY are left out on
// purpose: the first is needed to reach this database at all, the second to decrypt what is stored here.
export const ENV_GROUPS = {
  'Server': ['PORT', 'NODE_ENV', 'FRONTEND_URL'],
  'Authentication (JWT)': ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'],
  'Email (SMTP)': ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'],
  'Payment (Razorpay)': ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'],
  'SMS & OTP': ['USE_DEFAULT_OTP', 'PRPSMS_API_KEY', 'PRPSMS_SENDER_ID', 'PRPSMS_OTP_TEMPLATE', 'OTP_EXPIRY_MINUTES', 'OTP_MAX_ATTEMPTS'],
  'Cloudinary & Uploads': ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'UPLOAD_PATH'],
  'Firebase': ['FIREBASE_SERVICE_ACCOUNT'],
  'External APIs': ['GOOGLE_MAPS_API_KEY'],
  'Rate Limiting': ['RATE_LIMIT_WINDOW', 'RATE_LIMIT_MAX'],
}
const ALLOWED = new Set(Object.values(ENV_GROUPS).flat())
const SECRET = /SECRET|PASS|KEY|TOKEN|SERVICE_ACCOUNT/
const NEEDS_RESTART = new Set(['PORT', 'NODE_ENV', 'FRONTEND_URL'])
const MAX_LENGTH = 8000 // room for a Firebase service-account JSON

function validate(key, value) {
  if (value.length > MAX_LENGTH) throw badRequest(`${key} is too long`)
  if (key === 'PORT' && !(Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) < 65536)) {
    throw badRequest('PORT must be a number between 1 and 65535')
  }
}

export async function getEnvSettings(req, res) {
  const stored = new Map((await EnvSetting.find({}).select('key')).map((s) => [s.key, true]))
  const groups = Object.entries(ENV_GROUPS).map(([name, keys]) => ({
    name,
    keys: keys.map((key) => {
      const secret = SECRET.test(key)
      const current = process.env[key] || ''
      return {
        key,
        secret,
        restart: NEEDS_RESTART.has(key),
        isOverridden: stored.has(key),
        isSet: Boolean(current),
        // Secrets are never sent back to the browser, only whether one is set
        value: secret ? '' : current,
      }
    }),
  }))
  res.json({ success: true, data: { groups, encryptionConfigured: isEncryptionConfigured() } })
}

export async function updateEnvSettings(req, res) {
  if (!isEncryptionConfigured()) throw badRequest('Set ENCRYPTION_KEY in the server .env file before saving overrides')
  const updates = req.body || {}
  const unknown = Object.keys(updates).filter((k) => !ALLOWED.has(k))
  if (unknown.length) throw badRequest(`Not an editable variable: ${unknown.join(', ')}`)

  // Validate everything first so a bad value does not leave a half-applied update
  for (const [key, value] of Object.entries(updates)) {
    if (value !== '' && value != null) validate(key, String(value))
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === '' || value == null) {
      // Clearing an override: forget it, then fall back to the value in .env
      await EnvSetting.deleteOne({ key })
      if (fileEnv[key] !== undefined) process.env[key] = fileEnv[key]
      else delete process.env[key]
    } else {
      await EnvSetting.findOneAndUpdate({ key }, { value: encrypt(String(value)) }, { upsert: true })
      process.env[key] = String(value)
    }
  }
  refreshEnv()
  res.json({ success: true, message: 'Environment settings saved' })
}

// ---------------------------------------------------------------- Upload provider

export async function getUploadSettings(req, res) {
  res.json({
    success: true,
    data: {
      imageUploadProvider: await getUploadProvider(),
      cloudinaryConfigured: isCloudinaryConfigured(),
      nodeEnv: process.env.NODE_ENV || 'development',
      localUploadDir: resolveUploadRoot(),
    },
  })
}

export async function updateUploadSettings(req, res) {
  const { imageUploadProvider } = req.body || {}
  if (!['local', 'cloudinary'].includes(imageUploadProvider)) {
    throw badRequest('imageUploadProvider must be "local" or "cloudinary"')
  }
  if (imageUploadProvider === 'cloudinary' && !isCloudinaryConfigured()) {
    throw badRequest('Cloudinary is not configured on the server (missing CLOUDINARY_* env vars)')
  }
  res.json({ success: true, data: { imageUploadProvider: await setUploadProvider(imageUploadProvider) } })
}

// ---------------------------------------------------------------- Operational data

// What users and hotels generate by using the app. Master data (hotels, rooms, amenities,
// locations, customers, coupons, banners, admins, settings) is never touched.
const OPERATIONAL = [
  { key: 'bookings', label: 'Bookings', Model: Booking },
  { key: 'payments', label: 'Payments', Model: Payment },
  { key: 'payouts', label: 'Hotel payouts', Model: Payout },
  { key: 'reviews', label: 'Reviews & ratings', Model: Review },
  { key: 'supportTickets', label: 'Support tickets', Model: SupportTicket },
  { key: 'contactMessages', label: 'Contact messages', Model: ContactMessage },
  { key: 'notifications', label: 'Notifications', Model: Notification },
]
const CONFIRM_PHRASE = 'DELETE OPERATIONAL DATA'

export async function operationalCounts(req, res) {
  const counts = await Promise.all(OPERATIONAL.map(({ Model }) => Model.countDocuments()))
  res.json({
    success: true,
    data: {
      groups: OPERATIONAL.map((g, i) => ({ key: g.key, label: g.label, count: counts[i] })),
      total: counts.reduce((sum, n) => sum + n, 0),
      confirmPhrase: CONFIRM_PHRASE,
    },
  })
}

export async function clearOperationalData(req, res) {
  if (req.body?.confirm !== CONFIRM_PHRASE) throw badRequest(`Type "${CONFIRM_PHRASE}" to confirm`)
  const deleted = {}
  for (const { key, Model } of OPERATIONAL) {
    deleted[key] = (await Model.deleteMany({})).deletedCount || 0
  }
  const total = Object.values(deleted).reduce((sum, n) => sum + n, 0)
  console.warn(`[developer] admin ${req.auth.id} cleared ${total} operational records`)
  res.json({ success: true, data: { deleted, total } })
}

