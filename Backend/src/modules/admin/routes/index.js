import { Router } from 'express'
import { authenticate, authorize } from '../../../core/auth/auth.middleware.js'
import { ROLES } from '../../../core/roles/roles.js'
import { createResourceRouter } from '../services/resource.factory.js'
import { resources } from '../services/resources.config.js'
import * as auth from '../controllers/auth.controller.js'
import * as settings from '../controllers/settings.controller.js'
import { getDashboardStats } from '../controllers/dashboard.controller.js'
import { listReports } from '../controllers/reports.controller.js'

const router = Router()

// Public
router.post('/auth/login', auth.login)

// Everything below needs a valid admin token
router.use(authenticate, authorize(ROLES.ADMIN))

router.get('/ping', (req, res) => res.json({ success: true, module: 'admin' }))
router.get('/auth/me', auth.me)
router.patch('/auth/profile', auth.updateProfile)
router.post('/auth/change-password', auth.changePassword)

router.get('/dashboard/stats', getDashboardStats)
router.get('/settings', settings.getSettings)
router.put('/settings', settings.updateSettings)
router.get('/reports', listReports)

for (const [segment, config] of Object.entries(resources)) {
  router.use(`/${segment}`, createResourceRouter(config))
}

export default router
