import { Router } from 'express'
import { authenticate, authorize } from '../../../core/auth/auth.middleware.js'
import { ROLES } from '../../../core/roles/roles.js'
import { createResourceRouter } from '../services/resource.factory.js'
import { resources } from '../services/resources.config.js'
import * as auth from '../controllers/auth.controller.js'
import * as settings from '../controllers/settings.controller.js'
import { getDashboardStats } from '../controllers/dashboard.controller.js'
import * as reports from '../controllers/reports.controller.js'
import * as broadcast from '../controllers/broadcast.controller.js'
import * as pages from '../controllers/pages.controller.js'
import * as home from '../controllers/home.controller.js'
import * as dev from '../controllers/developer.controller.js'
import { requireSuperAdmin } from '../services/superAdmin.middleware.js'

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
router.get('/auth-pages', settings.getAuthPages)
router.put('/auth-pages', settings.updateAuthPages)
router.get('/home-page', home.getHomePage)
router.put('/home-page', home.updateHomePage)
router.get('/settings/toggles', settings.getToggles)
router.patch('/settings/toggles', settings.updateToggles)
router.get('/reports/daily-sales', reports.dailySales)
router.get('/reports/transactions', reports.transactions)
router.get('/reports/bookings', reports.bookings)
router.get('/reports/tax', reports.tax)
router.get('/reports/tax/:hotelId', reports.taxDetail)
router.get('/reports/admin-earnings', reports.adminEarnings)
router.get('/reports/cancellations', reports.cancellations)
router.get('/reports/hotels', reports.hotelPerformance)
router.get('/reports/hotel-payouts', reports.hotelPayouts)
router.get('/reports/customers', reports.topCustomers)
router.get('/reports/feedback', reports.feedback)
router.get('/broadcasts/recipients', broadcast.recipients)
router.get('/broadcasts', broadcast.list)
router.post('/broadcasts', broadcast.create)
router.delete('/broadcasts/:id', broadcast.remove)
router.get('/pages/:key', pages.getAdminPage)
router.put('/pages/:key', pages.updateAdminPage)

// Developer tools: super admin only
const developer = Router()
developer.use(requireSuperAdmin)
developer.get('/env', dev.getEnvSettings)
developer.put('/env', dev.updateEnvSettings)
developer.get('/upload-settings', dev.getUploadSettings)
developer.put('/upload-settings', dev.updateUploadSettings)
developer.get('/operational-data', dev.operationalCounts)
developer.post('/operational-data/clear', dev.clearOperationalData)
router.use('/developer', developer)

for (const [segment, config] of Object.entries(resources)) {
  router.use(`/${segment}`, createResourceRouter(config))
}

export default router
