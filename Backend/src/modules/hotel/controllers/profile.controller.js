import Owner from '../models/Owner.model.js'
import { badRequest, HttpError } from '../../../utils/httpError.js'
import { encrypt, isEncryptionConfigured } from '../../../utils/encryption.js'
import Settings from '../../../models/Settings.model.js'
import SupportTicket from '../../../models/SupportTicket.model.js'
import { IMAGE_PATH_PATTERN } from '../../../utils/uploadPaths.js'
import { publicOwner } from './auth.controller.js'

const PAN = /^[A-Z]{5}\d{4}[A-Z]$/
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/
const FILE_URL = /^(\/uploads\/[\w./-]+|https:\/\/\S+)$/
const DOC_TYPES = ['PAN card', 'Aadhaar', 'GST certificate', 'Cancelled cheque', 'Property proof', 'Other']
const MAX_DOCS = 8

const fullProfile = (o) => ({
  ...publicOwner(o),
  address: { line: o.address?.line || '', city: o.address?.city || '', state: o.address?.state || '', pincode: o.address?.pincode || '' },
  kyc: {
    status: o.kyc.status,
    panNumber: o.kyc.panNumber,
    panName: o.kyc.panName,
    gstin: o.kyc.gstin,
    documents: o.kyc.documents,
    rejectReason: o.kyc.rejectReason,
    submittedAt: o.kyc.submittedAt,
    verifiedAt: o.kyc.verifiedAt,
  },
  bank: { holderName: o.bank?.holderName || '', last4: o.bank?.last4 || '', ifsc: o.bank?.ifsc || '', bankName: o.bank?.bankName || '', upi: o.bank?.upi || '' },
})

export async function getProfile(req, res) {
  res.json({ success: true, data: fullProfile(req.owner) })
}

// PATCH /hotel/profile   { name?, email?, businessName? }
export async function updateProfile(req, res) {
  const o = req.owner
  const b = req.body || {}
  if (b.name !== undefined) {
    const name = String(b.name).trim()
    if (name.length < 2 || name.length > 80) throw badRequest('Name must be between 2 and 80 characters')
    o.name = name
  }
  if (b.email !== undefined) {
    const email = String(b.email).trim().toLowerCase()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Please enter a valid email address')
    o.email = email
  }
  if (b.businessName !== undefined) o.businessName = String(b.businessName).trim().slice(0, 100)
  if (b.photo !== undefined) {
    const photo = String(b.photo).trim()
    if (photo && !IMAGE_PATH_PATTERN.test(photo)) throw badRequest('Photo must be an uploaded image')
    o.photo = photo
  }
  if (b.address !== undefined) {
    const a = b.address || {}
    const pincode = String(a.pincode ?? '').trim()
    if (pincode && !/^\d{4,10}$/.test(pincode)) throw badRequest('Pincode must be 4 to 10 digits')
    o.address = { line: String(a.line ?? '').trim().slice(0, 200), city: String(a.city ?? '').trim().slice(0, 60), state: String(a.state ?? '').trim().slice(0, 60), pincode }
  }
  await o.save()
  res.json({ success: true, message: 'Profile saved', data: fullProfile(o) })
}

// POST /hotel/kyc   { panNumber, panName, gstin?, documents: [{type, url}], bank: { holderName, accountNumber, ifsc, bankName?, upi? } }
// An admin reviews it; until it is Verified the owner cannot send villas for approval.
export async function submitKyc(req, res) {
  const o = req.owner
  if (o.kyc.status === 'Submitted') throw new HttpError(409, 'Your details are already being reviewed')
  if (o.kyc.status === 'Verified') throw new HttpError(409, 'Your account is already verified. Contact support to change these details.')
  const b = req.body || {}

  const pan = String(b.panNumber || '').trim().toUpperCase()
  if (!PAN.test(pan)) throw badRequest('Enter a valid PAN number (for example ABCDE1234F)')
  const panName = String(b.panName || '').trim()
  if (panName.length < 2) throw badRequest('Enter the name as printed on the PAN card')
  const gstin = String(b.gstin || '').trim().toUpperCase()
  if (gstin && !GSTIN.test(gstin)) throw badRequest('Enter a valid 15 character GSTIN or leave it empty')

  const docs = Array.isArray(b.documents) ? b.documents : []
  if (!docs.length) throw badRequest('Upload at least one identity document')
  if (docs.length > MAX_DOCS) throw badRequest(`You can attach up to ${MAX_DOCS} documents`)
  const documents = docs.map((d) => {
    const url = String(d?.url || '').trim()
    if (!FILE_URL.test(url)) throw badRequest('A document link is not valid. Please upload it again.')
    return { type: DOC_TYPES.includes(d?.type) ? d.type : 'Other', url }
  })

  const bank = b.bank || {}
  const holderName = String(bank.holderName || '').trim()
  const accountNumber = String(bank.accountNumber || '').replace(/\s/g, '')
  const ifsc = String(bank.ifsc || '').trim().toUpperCase()
  if (holderName.length < 2) throw badRequest('Enter the bank account holder name')
  if (!/^\d{9,18}$/.test(accountNumber)) throw badRequest('Enter a valid bank account number (9 to 18 digits)')
  if (!IFSC.test(ifsc)) throw badRequest('Enter a valid IFSC code (for example HDFC0001234)')

  o.kyc = { status: 'Submitted', panNumber: pan, panName, gstin, documents, rejectReason: '', submittedAt: new Date() }
  o.bank = {
    holderName, last4: accountNumber.slice(-4), ifsc, bankName: String(bank.bankName || '').trim().slice(0, 60), upi: String(bank.upi || '').trim().slice(0, 60),
    // The full number is kept only when an encryption key is set up on the server
    accountNumberEnc: isEncryptionConfigured() ? encrypt(accountNumber) : '',
  }
  await o.save()
  res.json({ success: true, message: 'Details submitted. We will verify them shortly.', data: fullProfile(o) })
}

// ---- help & support (public: an owner who is still waiting for approval needs it too) ----------------------

const HOST_FAQS = [
  { q: 'How do I start listing my villa?', a: 'Submit your documents under Profile > KYC. After an admin approves them, add a villa, fill in photos, prices and booking types, and send it for approval.' },
  { q: 'How long does approval take?', a: 'Our team reviews documents and villas as soon as possible. You get a notification when it is done.' },
  { q: 'When do I get paid?', a: 'A booking becomes your earning once the guest has checked out. Payouts go to the bank account you added in KYC.' },
  { q: 'What if a guest cancels?', a: 'The refund follows the platform cancellation policy. If you cancel a confirmed booking, the guest is refunded in full.' },
  { q: 'How does check-in work?', a: 'Every confirmed booking has a 6-digit code. Ask the guest for it on arrival and enter it in Check-in / Check-out.' },
  { q: 'How do I block dates for repairs or personal use?', a: 'Open Calendar & Pricing, choose your villa and tap Block time.' },
]

// The number the admin saved in Business Setup, as digits with the country code, ready for call / chat links
function dialDigits(phone, countryCode) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.length <= 10 ? `${String(countryCode || '+91').replace(/\D/g, '')}${digits}` : digits
}

export async function supportInfo(req, res) {
  const s = await Settings.get()
  const phone = s.supportPhone || (s.phoneNumber ? `${s.phoneCountryCode} ${s.phoneNumber}` : '')
  res.json({
    success: true,
    data: {
      email: s.supportEmail || s.email || '',
      phone,
      dial: dialDigits(s.supportPhone || s.phoneNumber, s.phoneCountryCode), // e.g. 919876543210
      hours: s.supportHours || '',
      companyName: s.companyName,
      faqs: HOST_FAQS,
    },
  })
}

const ticketView = (t) => ({ id: String(t._id), code: t.refId, subject: t.subject, description: t.description, status: t.status, priority: t.priority, createdAt: t.createdAt, updatedAt: t.updatedAt })

// GET /hotel/support/tickets   the owner's own tickets (open to owners still waiting for approval too)
export async function listTickets(req, res) {
  const tickets = await SupportTicket.find({ owner: req.owner._id }).sort({ createdAt: -1 }).limit(50).lean()
  res.json({ success: true, data: tickets.map(ticketView) })
}

// POST /hotel/support/tickets   { subject, description }  shows up in Admin > Support Tickets
export async function createTicket(req, res) {
  const subject = String(req.body?.subject || '').trim()
  const description = String(req.body?.description || '').trim()
  if (subject.length < 3 || subject.length > 100) throw badRequest('Subject must be between 3 and 100 characters')
  if (description.length < 10 || description.length > 1000) throw badRequest('Please describe the problem in 10 to 1000 characters')
  const open = await SupportTicket.countDocuments({ owner: req.owner._id, status: { $in: ['Open', 'In Progress'] } })
  if (open >= 5) throw badRequest('You already have 5 open tickets. Please wait for a reply before raising more.')
  const ticket = await SupportTicket.create({ owner: req.owner._id, subject, description, raisedBy: `${req.owner.name} (${req.owner.phone})`, raisedByType: 'Hotel' })
  res.status(201).json({ success: true, message: 'Your request has been sent. We will get back to you soon.', data: ticketView(ticket) })
}
