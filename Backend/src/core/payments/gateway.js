import crypto from 'crypto'
import { env } from '../../config/env.js'
import { HttpError } from '../../utils/httpError.js'

// The payment gateway behind one small interface, so booking code never talks to Razorpay directly
// and tests can swap in a fake. Keys are read on every call because admins can change them from
// Admin > Developer > Env Managements without a restart.

const API = 'https://api.razorpay.com/v1'
const keys = () => ({
  id: process.env.RAZORPAY_KEY_ID || '',
  secret: process.env.RAZORPAY_KEY_SECRET || '',
  webhook: process.env.RAZORPAY_WEBHOOK_SECRET || '',
})

const hmac = (secret, text) => crypto.createHmac('sha256', secret).update(text).digest('hex')
const same = (a, b) => {
  const x = Buffer.from(String(a || ''))
  const y = Buffer.from(String(b || ''))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

// 'razorpay' when keys are set. Without keys, development runs a clearly-labelled test mode;
// production refuses to take payments rather than pretending.
export function paymentMode() {
  const k = keys()
  if (k.id && k.secret) return 'razorpay'
  return env.nodeEnv === 'production' ? 'unavailable' : 'mock'
}

async function call(method, path, body) {
  const k = keys()
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Basic ${Buffer.from(`${k.id}:${k.secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error?.description || `Razorpay error ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

const razorpay = {
  mode: 'razorpay',
  keyId: () => keys().id,
  createOrder: ({ amountPaise, receipt, notes }) => call('POST', '/orders', { amount: amountPaise, currency: 'INR', receipt, notes }),
  fetchPayment: (paymentId) => call('GET', `/payments/${encodeURIComponent(paymentId)}`),
  capturePayment: (paymentId, amountPaise) => call('POST', `/payments/${encodeURIComponent(paymentId)}/capture`, { amount: amountPaise, currency: 'INR' }),
  fetchOrderPayments: async (orderId) => (await call('GET', `/orders/${encodeURIComponent(orderId)}/payments`)).items || [],
  createRefund: (paymentId, { amountPaise, receipt, notes }) => call('POST', `/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountPaise, speed: 'normal', receipt, notes }),
  listRefunds: async (paymentId) => (await call('GET', `/payments/${encodeURIComponent(paymentId)}/refunds`)).items || [],
  verifyCheckoutSignature: ({ orderId, paymentId, signature }) => same(hmac(keys().secret, `${orderId}|${paymentId}`), signature),
  verifyWebhook: (rawBody, signature) => Boolean(keys().webhook) && same(hmac(keys().webhook, rawBody), signature),
}

// Development stand-in: nothing leaves the machine. The mock "payment" is created by the server itself.
const MOCK_SECRET = 'ovistays-mock-gateway'
const mock = {
  mode: 'mock',
  keyId: () => 'mock',
  createOrder: async ({ amountPaise }) => ({ id: `order_mock_${crypto.randomBytes(8).toString('hex')}`, amount: amountPaise, currency: 'INR' }),
  fetchPayment: async () => { throw new Error('Mock payments cannot be fetched') },
  capturePayment: async () => ({}),
  fetchOrderPayments: async () => [],
  createRefund: async (paymentId, { amountPaise, receipt }) => ({ id: `rfnd_mock_${crypto.randomBytes(6).toString('hex')}`, status: 'processed', amount: amountPaise, receipt }),
  listRefunds: async () => [],
  verifyCheckoutSignature: ({ orderId, paymentId, signature }) => same(hmac(MOCK_SECRET, `${orderId}|${paymentId}`), signature),
  verifyWebhook: () => false,
}
export const mockSignature = (orderId, paymentId) => hmac(MOCK_SECRET, `${orderId}|${paymentId}`)

let override = null
// Tests install a fake gateway here; pass null to go back to the real one
export const setGateway = (g) => { override = g }

export function gateway() {
  if (override) return override
  const mode = paymentMode()
  if (mode === 'razorpay') return razorpay
  if (mode === 'mock') return mock
  throw new HttpError(503, 'Online payments are not available right now. Please try again later.')
}
