import { Router } from 'express'
import adminRoutes from '../modules/admin/routes/index.js'
import userRoutes from '../modules/user/routes/index.js'
import hotelRoutes from '../modules/hotel/routes/index.js'

const router = Router()

router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }))
router.use('/admin', adminRoutes)
router.use('/user', userRoutes)
router.use('/hotel', hotelRoutes)

export default router
