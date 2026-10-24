import Settings from '../../../models/Settings.model.js'
import { badRequest } from '../../../utils/httpError.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TEXT_FIELDS = ['companyName', 'email', 'phoneCountryCode', 'phoneNumber', 'address', 'state', 'pincode', 'region', 'gstin', 'supportEmail', 'supportPhone', 'supportHours']
const NUMBER_FIELDS = ['commissionRate', 'platformFee', 'gstRate', 'cancelHours']
const FILE_FIELDS = ['logo', 'userLogo', 'hotelLogo', 'favicon', 'termsAndConditionsPdf']

// Shape sent to the admin form: everything, with files as { url, publicId }
const adminView = (s) => {
  const { __v, ...rest } = s.toObject()
  return rest
}

function validate(body) {
  const text = (k) => String(body[k] ?? '').trim()
  if (body.companyName !== undefined && (text('companyName').length < 2 || text('companyName').length > 50)) {
    throw badRequest('Company name must be between 2 and 50 characters')
  }
  if (body.email !== undefined && text('email') && !EMAIL.test(text('email'))) throw badRequest('Invalid email address')
  if (body.phoneNumber !== undefined && text('phoneNumber') && !/^\d{7,15}$/.test(text('phoneNumber'))) {
    throw badRequest('Invalid phone number (7-15 digits required)')
  }
  if (body.pincode !== undefined && text('pincode') && !/^\d{4,10}$/.test(text('pincode'))) {
    throw badRequest('Invalid pincode (4-10 digits required)')
  }
  if (body.supportEmail !== undefined && text('supportEmail') && !EMAIL.test(text('supportEmail'))) {
    throw badRequest('Invalid support email address')
  }
  if (body.supportPhone !== undefined && text('supportPhone') && !/^\d{7,15}$/.test(text('supportPhone'))) {
    throw badRequest('Invalid support phone number (7-15 digits required)')
  }
  if (body.gstin !== undefined && text('gstin') && !/^[0-9A-Za-z]{15}$/.test(text('gstin'))) {
    throw badRequest('GSTIN must be 15 letters or digits')
  }
}

const TOGGLE_FLAGS = ['onlinePaymentOnly', 'maintenanceMode', 'userRegistration', 'hotelRegistration']
const toggleView = (s) => ({
  onlinePaymentOnly: s.onlinePaymentOnly,
  maxPayAtHotelAmount: s.maxPayAtHotelAmount,
  maintenanceMode: s.maintenanceMode,
  userRegistration: s.userRegistration,
  hotelRegistration: s.hotelRegistration,
})

export async function getToggles(req, res) {
  res.json({ success: true, data: toggleView(await Settings.get()) })
}

// PATCH /api/admin/settings/toggles  - any subset of the toggles, saved immediately
export async function updateToggles(req, res) {
  const body = req.body || {}
  const s = await Settings.get()
  let changed = 0

  for (const flag of TOGGLE_FLAGS) {
    if (body[flag] === undefined) continue
    // Strict: "false" (a string) must not silently count as true
    if (typeof body[flag] !== 'boolean') throw badRequest(`${flag} must be true or false`)
    s[flag] = body[flag]
    changed++
  }
  if (body.maxPayAtHotelAmount !== undefined) {
    const amount = Number(body.maxPayAtHotelAmount)
    if (!Number.isFinite(amount) || amount < 0) throw badRequest('Maximum pay-at-hotel amount must be 0 or more')
    s.maxPayAtHotelAmount = amount
    changed++
  }
  if (!changed) throw badRequest('Nothing to update')

  await s.save()
  res.json({ success: true, message: 'Toggle settings updated', data: toggleView(s) })
}

export async function getSettings(req, res) {
  res.json({ success: true, data: adminView(await Settings.get()) })
}

export async function updateSettings(req, res) {
  const body = req.body || {}
  validate(body)

  const s = await Settings.get()
  for (const key of TEXT_FIELDS) if (body[key] !== undefined) s[key] = body[key]
  for (const key of NUMBER_FIELDS) if (body[key] !== undefined) s[key] = body[key]
  if (body.currency !== undefined) s.currency = body.currency

  // Files arrive as { url } (already uploaded through /api/uploads) or as a plain URL string
  for (const key of FILE_FIELDS) {
    if (body[key] === undefined) continue
    const url = typeof body[key] === 'string' ? body[key] : body[key]?.url
    const publicId = typeof body[key] === 'object' ? body[key]?.publicId : ''
    s[key] = { url: String(url ?? '').trim(), publicId: publicId || '' }
  }

  await s.save()
  res.json({ success: true, message: 'Business settings saved', data: adminView(s) })
}
