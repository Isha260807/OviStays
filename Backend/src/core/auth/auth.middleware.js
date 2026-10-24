import { verifyAccessToken } from './token.util.js'

export function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' })
  try {
    req.auth = verifyAccessToken(token)
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.auth?.role)
    ? next()
    : res.status(403).json({ success: false, message: 'Forbidden' })
