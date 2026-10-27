import { Router } from 'express'
import { authenticate, authorize } from '../../../core/auth/auth.middleware.js'
import { ROLES } from '../../../core/roles/roles.js'
import { rateLimit } from '../../../core/security/rateLimit.js'
import { normalizePhone } from '../../user/services/otp.service.js'
import { requireOwner, requireVerifiedOwner } from '../services/session.service.js'

import * as auth from '../controllers/auth.controller.js'
import * as profile from '../controllers/profile.controller.js'
import * as villa from '../controllers/villa.controller.js'
import * as calendar from '../controllers/calendar.controller.js'
import * as booking from '../controllers/booking.controller.js'
import * as dash from '../controllers/dashboard.controller.js'

const router = Router()

const MINUTE = 60 * 1000
const phoneKey = (req) => `owner:${req.path}:${normalizePhone(req.body?.phone) || req.ip}`
const authIpLimit = rateLimit({ windowMs: 15 * MINUTE, max: 60, key: (req) => `owner-auth:${req.ip}`, message: 'Too many attempts. Please try again in a few minutes.' })
const otpSendLimit = rateLimit({ windowMs: 10 * MINUTE, max: 8, key: phoneKey, message: 'Too many OTP requests for this number. Please try again in a few minutes.' })
const otpVerifyLimit = rateLimit({ windowMs: 15 * MINUTE, max: 15, key: phoneKey, message: 'Too many attempts. Please try again in a few minutes.' })
const ticketLimit = rateLimit({ windowMs: 60 * MINUTE, max: 10, key: (req) => `owner-ticket:${req.auth?.id || req.ip}`, message: 'Too many requests. Please try again later.' })
const checkInLimit = rateLimit({ windowMs: 10 * MINUTE, max: 40, key: (req) => `owner-checkin:${req.auth?.id || req.ip}` })

// Public
router.post('/auth/register', authIpLimit, otpSendLimit, auth.register)
router.post('/auth/send-otp', authIpLimit, otpSendLimit, auth.sendOtp)
router.post('/auth/verify-otp', authIpLimit, otpVerifyLimit, auth.verifyOtp)
router.post('/auth/refresh', authIpLimit, auth.refresh)
router.post('/auth/logout', authIpLimit, auth.logout)

router.get('/support', profile.supportInfo)

// Everything below needs a signed-in owner whose session is still active
router.use(authenticate, authorize(ROLES.HOTEL), requireOwner)

router.get('/ping', (req, res) => res.json({ success: true, module: 'hotel' }))
router.get('/auth/me', auth.me)
router.post('/auth/logout-all', auth.logoutAll)

router.get('/profile', profile.getProfile)
router.patch('/profile', profile.updateProfile)
router.post('/kyc', profile.submitKyc)

router.get('/notifications', dash.notifications)
router.get('/notifications/unread-count', dash.unreadCount)
router.post('/notifications/read-all', dash.markAllRead)
router.post('/notifications/:id/read', dash.markRead)

router.get('/support/tickets', profile.listTickets)
router.post('/support/tickets', ticketLimit, profile.createTicket)

// Only owners an admin has verified get past this point
router.use(requireVerifiedOwner)

router.get('/dashboard', dash.stats)
router.get('/earnings', dash.earnings)
router.get('/reviews', dash.reviews)
router.get('/amenities', villa.amenities)
router.get('/villas', villa.list)
router.post('/villas', villa.create)
router.get('/villas/:id', villa.get)
router.patch('/villas/:id', villa.update)
router.delete('/villas/:id', villa.remove)
router.post('/villas/:id/submit', villa.submit)
router.post('/villas/:id/active', villa.setActive)

router.get('/villas/:id/calendar', calendar.getCalendar)
router.post('/villas/:id/blocks', calendar.createBlock)
router.delete('/villas/:id/blocks/:blockId', calendar.removeBlock)
router.get('/villas/:id/price-rules', calendar.listRules)
router.post('/villas/:id/price-rules', calendar.createRule)
router.patch('/villas/:id/price-rules/:ruleId', calendar.updateRule)
router.delete('/villas/:id/price-rules/:ruleId', calendar.removeRule)

router.get('/bookings', booking.list)
router.get('/bookings/:id', booking.get)
router.post('/bookings/:id/accept', booking.accept)
router.post('/bookings/:id/reject', booking.reject)
router.post('/bookings/:id/cancel', booking.cancel)
router.post('/bookings/:id/check-in', checkInLimit, booking.checkIn)
router.post('/bookings/:id/check-out', booking.checkOutGuest)

export default router
