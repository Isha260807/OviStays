import { Router } from 'express'
import { authenticate, authorize } from '../../../core/auth/auth.middleware.js'
import { ROLES } from '../../../core/roles/roles.js'

const router = Router()

router.get('/ping', authenticate, authorize(ROLES.USER), (req, res) => {
  res.json({ success: true, module: 'user' })
})

export default router
