import Admin from '../models/Admin.model.js'
import { signAccessToken } from '../../../core/auth/token.util.js'
import { ROLES } from '../../../core/roles/roles.js'
import { badRequest, HttpError } from '../../../utils/httpError.js'

const publicAdmin = (a) => ({
  _id: a._id, refId: a.refId, name: a.name, email: a.email, phone: a.phone,
  role: a.role, designation: a.designation,
})

export async function login(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')
  if (!email || !password) throw badRequest('Email and password are required')

  const admin = await Admin.findOne({ email }).select('+passwordHash')
  // Same message for unknown email and wrong password so accounts cannot be probed
  if (!admin || !(await admin.verifyPassword(password))) throw new HttpError(401, 'Invalid email or password')
  if (admin.status !== 'Active') throw new HttpError(403, 'This account is disabled')

  const token = signAccessToken({ id: String(admin._id), role: ROLES.ADMIN }, '12h')
  res.json({ success: true, data: { token, admin: publicAdmin(admin) } })
}

export async function me(req, res) {
  const admin = await Admin.findById(req.auth.id)
  if (!admin || admin.status !== 'Active') throw new HttpError(401, 'Account not available')
  res.json({ success: true, data: publicAdmin(admin) })
}

export async function updateProfile(req, res) {
  const admin = await Admin.findById(req.auth.id)
  if (!admin) throw new HttpError(401, 'Account not available')
  for (const key of ['name', 'email', 'phone']) {
    if (req.body[key] !== undefined) admin[key] = req.body[key]
  }
  await admin.save()
  res.json({ success: true, data: publicAdmin(admin) })
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body
  if (String(newPassword || '').length < 8) throw badRequest('New password must be at least 8 characters')
  const admin = await Admin.findById(req.auth.id).select('+passwordHash')
  if (!admin || !(await admin.verifyPassword(String(currentPassword || '')))) {
    throw badRequest('Current password is incorrect')
  }
  admin.passwordHash = await Admin.hashPassword(newPassword)
  await admin.save()
  res.json({ success: true })
}
