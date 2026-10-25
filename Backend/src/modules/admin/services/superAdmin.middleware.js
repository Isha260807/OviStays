import Admin from '../models/Admin.model.js'

// Developer tools can change server config and delete data, so only the main (ADMIN) account may use
// them, not sub admins. The role is read from the database, so demoting an admin takes effect at once.
export async function requireSuperAdmin(req, res, next) {
  const admin = await Admin.findById(req.auth.id).select('role status')
  if (!admin || admin.status !== 'Active' || admin.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Super admin access required' })
  }
  next()
}
