import { Router } from 'express'
import { authenticate, authorize } from '../../../core/auth/auth.middleware.js'
import { ROLES } from '../../../core/roles/roles.js'
import { rateLimit } from '../../../core/security/rateLimit.js'
import { normalizePhone } from '../services/otp.service.js'
import { requireActiveSession } from '../services/session.service.js'

import * as auth from '../controllers/auth.controller.js'
import * as home from '../controllers/home.controller.js'
import * as villa from '../controllers/villa.controller.js'
import * as search from '../controllers/search.controller.js'
import * as profile from '../controllers/profile.controller.js'
import * as activity from '../controllers/activity.controller.js'

const router = Router()

// Login endpoints are limited per IP, and OTP requests / attempts per phone number as well
const MINUTE = 60 * 1000
const phoneKey = (req) => `${req.path}:${normalizePhone(req.body?.phone) || req.ip}`
const authIpLimit = rateLimit({ windowMs: 15 * MINUTE, max: 60, message: 'Too many attempts. Please try again in a few minutes.' })
const otpSendLimit = rateLimit({ windowMs: 10 * MINUTE, max: 8, key: phoneKey, message: 'Too many OTP requests for this number. Please try again in a few minutes.' })
const otpVerifyLimit = rateLimit({ windowMs: 15 * MINUTE, max: 15, key: phoneKey, message: 'Too many attempts. Please try again in a few minutes.' })
const emailOtpLimit = rateLimit({ windowMs: 10 * MINUTE, max: 6, key: (req) => `email:${req.ip}`, message: 'Too many requests. Please try again in a few minutes.' })

// Public routes
router.get('/auth/config', auth.getAuthConfig)
router.post('/auth/send-otp', authIpLimit, otpSendLimit, auth.sendOtp)
router.post('/auth/verify-otp', authIpLimit, otpVerifyLimit, auth.verifyOtp)
router.post('/auth/register', authIpLimit, otpSendLimit, auth.register)
router.post('/auth/refresh', authIpLimit, auth.refresh)
router.post('/auth/logout', authIpLimit, auth.logout)

router.get('/home', home.getHome)
router.get('/villas', search.searchVillas)
router.get('/villas/filters', search.villaFilters)
router.get('/villas/:id', villa.getVilla)
router.get('/search/suggestions', search.suggestions)
router.get('/destinations', search.destinations)
router.get('/offers', search.offers)
router.get('/support', activity.supportInfo)

// Signed-in guest routes (the token must belong to a session that is still active)
const guest = [authenticate, authorize(ROLES.USER), requireActiveSession]

router.get('/auth/me', ...guest, auth.me)
router.get('/auth/sessions', ...guest, auth.sessions)
router.delete('/auth/sessions/:sessionId', ...guest, auth.revokeSession)
router.post('/auth/logout-all', ...guest, auth.logoutAll)

router.get('/profile', ...guest, profile.getProfile)
router.patch('/profile', ...guest, profile.updateProfile)
router.post('/profile/email/send-otp', ...guest, emailOtpLimit, profile.sendEmailOtp)
router.post('/profile/email/verify', ...guest, emailOtpLimit, profile.verifyEmailOtp)
router.get('/profile/billing', ...guest, profile.getBilling)
router.put('/profile/billing', ...guest, profile.updateBilling)
router.get('/profile/preferences', ...guest, profile.getPreferences)
router.put('/profile/preferences', ...guest, profile.updatePreferences)
router.delete('/account', ...guest, profile.deleteAccount)

router.get('/guests', ...guest, profile.listGuests)
router.post('/guests', ...guest, profile.addGuest)
router.put('/guests/:guestId', ...guest, profile.updateGuest)
router.delete('/guests/:guestId', ...guest, profile.removeGuest)

router.get('/wishlist', ...guest, profile.getWishlist)
router.put('/wishlist/:villaId', ...guest, profile.addToWishlist)
router.delete('/wishlist/:villaId', ...guest, profile.removeFromWishlist)

router.get('/notifications', ...guest, activity.listNotifications)
router.get('/notifications/unread-count', ...guest, activity.unreadCount)
router.post('/notifications/read-all', ...guest, activity.markAllNotificationsRead)
router.post('/notifications/:id/read', ...guest, activity.markNotificationRead)

router.get('/support/tickets', ...guest, activity.listTickets)
router.post('/support/tickets', ...guest, activity.createTicket)

router.get('/bookings', ...guest, activity.listBookings)
router.post('/bookings/:bookingId/review', ...guest, activity.createReview)
router.get('/reviews', ...guest, activity.listMyReviews)
router.delete('/reviews/:id', ...guest, activity.deleteMyReview)

router.get('/ping', ...guest, (req, res) => {
  res.json({ success: true, module: 'user' })
})

export default router
