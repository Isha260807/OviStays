import { Router } from 'express'
import { authenticate, authorize } from '../../../core/auth/auth.middleware.js'
import { ROLES } from '../../../core/roles/roles.js'

import * as auth from '../controllers/auth.controller.js'
import * as home from '../controllers/home.controller.js'
import * as villa from '../controllers/villa.controller.js'

const router = Router()

// Public auth routes
router.get('/auth/config', auth.getAuthConfig)
router.get('/home', home.getHome)
router.get('/villas/:id', villa.getVilla)
router.post('/auth/send-otp', auth.sendOtp)
router.post('/auth/verify-otp', auth.verifyOtp)
router.post('/auth/register', auth.register)

// Authenticated user routes
router.get('/auth/me', authenticate, authorize(ROLES.USER), auth.me)
router.get('/ping', authenticate, authorize(ROLES.USER), (req, res) => {
  res.json({ success: true, module: 'user' })
})

export default router
