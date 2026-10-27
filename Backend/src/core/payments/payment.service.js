import Payment from '../../models/Payment.model.js'
import Booking from '../../models/Booking.model.js'
import { gateway } from './gateway.js'
import { HttpError } from '../../utils/httpError.js'

// Everything that touches a Payment record: creating the gateway order, recording the result and
// sending refunds. Each step is safe to repeat: a second call finds the work already done.

const METHODS = { upi: 'UPI', card: 'Card', netbanking: 'Net Banking', wallet: 'Wallet' }
const MAX_REFUND_ATTEMPTS = 8
const note = (event, text = '') => ({ at: new Date(), event, note: text })

// Order for the amount snapshotted on the booking. A still-open order for the same amount is reused.
export async function createOrderForBooking(booking) {
  const amountPaise = booking.pricing.totalPaise
  if (!amountPaise) throw new HttpError(409, 'This booking has nothing to pay')

  const open = await Payment.findOne({ booking: booking._id, status: 'Created', amountPaise })
  if (open) return { payment: open, gw: gateway() }

  const gw = gateway()
  const order = await gw.createOrder({ amountPaise, receipt: String(booking.refId), notes: { booking: String(booking._id), code: booking.refId } })
  const payment = await Payment.create({
    booking: booking._id, bookingCode: booking.refId, guestName: booking.guestName,
    amount: amountPaise / 100, amountPaise, status: 'Created', provider: gw.mode, orderId: order.id,
    history: [note('order_created', order.id)],
  })
  return { payment, gw }
}

// Marks a payment as paid. Only the first caller gets the document back (the others see null),
// so a payment confirmed by the browser and by the webhook at once is processed one time.
export async function markPaid(paymentDocId, gp) {
  return Payment.findOneAndUpdate(
    { _id: paymentDocId, status: { $in: ['Created', 'Pending', 'Failed'] } },
    {
      $set: { status: 'Paid', gatewayPaymentId: gp.id, paidAt: new Date(), method: METHODS[gp.method] || 'UPI' },
      $push: { history: note('paid', gp.id) },
    },
    { returnDocument: 'after' }
  )
}

export async function markFailed(orderId, reason = '') {
  const payment = await Payment.findOneAndUpdate(
    { orderId, status: { $in: ['Created', 'Pending'] } },
    { $set: { status: 'Failed' }, $push: { history: note('failed', reason) } },
    { returnDocument: 'after' }
  )
  if (payment) await Booking.updateOne({ _id: payment.booking, paymentStatus: 'Unpaid' }, { paymentStatus: 'Failed' })
  return payment
}

// Records a refund request (once per key) and returns the payment, or null when it was already requested
export async function requestRefund(payment, amountPaise, key, reason) {
  if (!amountPaise) return null
  return Payment.findOneAndUpdate(
    {
      _id: payment._id, status: { $in: ['Paid', 'Partially Refunded'] }, 'refunds.key': { $ne: key },
      refundedPaise: { $lte: payment.amountPaise - amountPaise },
    },
    {
      $inc: { refundedPaise: amountPaise },
      $push: { refunds: { key, amountPaise, reason, status: 'Pending', requestedAt: new Date() }, history: note('refund_requested', `${key}: ${amountPaise}`) },
    },
    { returnDocument: 'after' }
  )
}

// Sends one pending refund to the gateway. A failure leaves it Failed so the retry job picks it up.
export async function processRefund(paymentId, key) {
  const payment = await Payment.findById(paymentId)
  const refund = payment?.refunds.find((r) => r.key === key)
  if (!refund || refund.status === 'Processed' || refund.attempts >= MAX_REFUND_ATTEMPTS) return payment

  await Payment.updateOne({ _id: paymentId, 'refunds.key': key }, { $inc: { 'refunds.$.attempts': 1 } })
  try {
    const gw = gateway()
    // After an unclear failure the refund may already exist at the gateway; look before sending another
    let done = refund.attempts > 0 ? (await gw.listRefunds(payment.gatewayPaymentId)).find((r) => r.notes?.key === key) : null
    done ||= await gw.createRefund(payment.gatewayPaymentId, { amountPaise: refund.amountPaise, receipt: key.slice(0, 40), notes: { key } })
    return await finishRefund(paymentId, key, done.id)
  } catch (err) {
    await Payment.updateOne({ _id: paymentId, 'refunds.key': key }, { $set: { 'refunds.$.status': 'Failed', 'refunds.$.lastError': String(err.message).slice(0, 200) }, $push: { history: note('refund_failed', err.message) } })
    return null
  }
}

export async function finishRefund(paymentId, key, gatewayRefundId) {
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, 'refunds.key': key, 'refunds.status': { $ne: 'Processed' } },
    { $set: { 'refunds.$.status': 'Processed', 'refunds.$.gatewayRefundId': gatewayRefundId, 'refunds.$.processedAt': new Date() }, $push: { history: note('refund_processed', gatewayRefundId) } },
    { returnDocument: 'after' }
  )
  if (!payment) return Payment.findById(paymentId)
  const processed = payment.refunds.filter((r) => r.status === 'Processed').reduce((s, r) => s + r.amountPaise, 0)
  const full = processed >= payment.amountPaise
  payment.status = full ? 'Refunded' : 'Partially Refunded'
  await payment.save()
  // The booking shows Refunded only when everything that was due has gone back
  const pending = payment.refunds.some((r) => r.status !== 'Processed')
  await Booking.updateOne({ _id: payment.booking }, { paymentStatus: pending ? 'Refund Pending' : full ? 'Refunded' : 'Partially Refunded' })
  return payment
}

// Refunds that failed or never got sent; run by the background job
export async function retryRefunds(limit = 20) {
  const payments = await Payment.find({ refunds: { $elemMatch: { status: { $in: ['Pending', 'Failed'] }, attempts: { $lt: MAX_REFUND_ATTEMPTS } } } }).limit(limit)
  for (const p of payments) {
    for (const r of p.refunds) {
      if (r.status !== 'Processed' && r.attempts < MAX_REFUND_ATTEMPTS) await processRefund(p._id, r.key)
    }
  }
  return payments.length
}
