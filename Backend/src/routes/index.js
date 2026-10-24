import { Router } from 'express'
import adminRoutes from '../modules/admin/routes/index.js'
import userRoutes from '../modules/user/routes/index.js'
import hotelRoutes from '../modules/hotel/routes/index.js'
import uploadRoutes from '../core/uploads/upload.routes.js'
import settingsRoutes from '../core/settings/settings.routes.js'
import pagesRoutes from '../core/pages/pages.routes.js'

const router = Router()

router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }))
router.use('/admin', adminRoutes)
router.use('/user', userRoutes)
router.use('/hotel', hotelRoutes)
router.use('/uploads', uploadRoutes)
router.use('/settings', settingsRoutes)
router.use('/pages', pagesRoutes)

export default router
