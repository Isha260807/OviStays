import { Router } from 'express'
import Payment from '../../models/Payment.model.js'
import PaymentEvent from '../../models/PaymentEvent.model.js'
import { gateway } from './gateway.js'
import { finishRefund, markFailed } from './payment.service.js'
import { confirmAfterPayment } from '../../modules/user/services/booking.service.js'

const router = Router()

// POST /api/payments/razorpay/webhook
// Razorpay signs the exact bytes it sends; the body parser keeps them in req.rawBody for this check.
// A delivery that was already handled is acknowledged and ignored, and one that fails is not remembered,
// so Razorpay's retry can complete it.
router.post('/razorpay/webhook', async (req, res) => {
  const signature = req.get('x-razorpay-signature')
  let valid = false
  try { valid = Boolean(req.rawBody) && gateway().verifyWebhook(req.rawBody.toString('utf8'), signature) } catch { valid = false }
  if (!valid) return res.status(400).json({ success: false, message: 'Invalid signature' })

  const event = req.body || {}
  const payment = event.payload?.payment?.entity
  const refund = event.payload?.refund?.entity
  const eventId = req.get('x-razorpay-event-id') || `${event.event}:${payment?.id || refund?.id}:${event.created_at}`

  try {
    await PaymentEvent.create({ eventId, type: event.event })
  } catch (err) {
    if (err?.code === 11000) return res.json({ success: true, duplicate: true })
    throw err
  }

  try {
    if (event.event === 'payment.captured' && payment?.order_id) {
      const doc = await Payment.findOne({ orderId: payment.order_id })
      if (doc && doc.amountPaise === payment.amount) await confirmAfterPayment(doc._id, payment)
    } else if (event.event === 'payment.failed' && payment?.order_id) {
      await markFailed(payment.order_id, payment.error_description || 'Payment failed')
    } else if (event.event === 'refund.processed' && refund?.payment_id) {
      const doc = await Payment.findOne({ gatewayPaymentId: refund.payment_id })
      const key = refund.notes?.key
      if (doc && key) await finishRefund(doc._id, key, refund.id)
    }
  } catch (err) {
    await PaymentEvent.deleteOne({ eventId })
    throw err
  }
  res.json({ success: true })
})

export default router
