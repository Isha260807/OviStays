import { Router } from 'express'
import { authenticate, authorize } from '../../../core/auth/auth.middleware.js'
import { ROLES } from '../../../core/roles/roles.js'

import * as auth from '../controllers/auth.controller.js'
import * as home from '../controllers/home.controller.js'
import * as villa from '../controllers/villa.controller.js'
import * as profile from '../controllers/profile.controller.js'

const router = Router()

// Public auth routes
router.get('/auth/config', auth.getAuthConfig)
router.get('/home', home.getHome)
router.get('/villas/:id', villa.getVilla)
router.post('/auth/send-otp', auth.sendOtp)
router.post('/auth/verify-otp', auth.verifyOtp)
router.post('/auth/register', auth.register)

// Authenticated user routes
const guest = [authenticate, authorize(ROLES.USER)]
router.get('/profile', ...guest, profile.getProfile)
router.patch('/profile', ...guest, profile.updateProfile)
router.delete('/account', ...guest, profile.deleteAccount)
router.get('/guests', ...guest, profile.listGuests)
router.post('/guests', ...guest, profile.addGuest)
router.put('/guests/:guestId', ...guest, profile.updateGuest)
router.delete('/guests/:guestId', ...guest, profile.removeGuest)
router.get('/wishlist', ...guest, profile.getWishlist)
router.put('/wishlist/:villaId', ...guest, profile.addToWishlist)
router.delete('/wishlist/:villaId', ...guest, profile.removeFromWishlist)
router.get('/auth/me', authenticate, authorize(ROLES.USER), auth.me)
router.get('/ping', authenticate, authorize(ROLES.USER), (req, res) => {
  res.json({ success: true, module: 'user' })
})

export default router
