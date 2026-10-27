// Shared set-up for database tests. Uses its own database so development data is never touched.
import './env-setup.js'
import mongoose from 'mongoose'
import crypto from 'crypto'
import { setGateway } from '../src/core/payments/gateway.js'
import Hotel from '../src/models/Hotel.model.js'
import Owner from '../src/modules/hotel/models/Owner.model.js'
import User from '../src/modules/user/models/User.model.js'
import Settings from '../src/models/Settings.model.js'
import { addDays } from '../src/utils/time.js'

export async function connect() {
  await mongoose.connect(process.env.MONGO_URI)
  if (!mongoose.connection.name.endsWith('_test')) throw new Error('Refusing to run tests on a non-test database')
  await mongoose.connection.dropDatabase()
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()))
}

export const disconnect = () => mongoose.disconnect()

// A gateway that records what was asked of it
export function fakeGateway() {
  const calls = { orders: [], refunds: [] }
  const gw = {
    mode: 'mock',
    keyId: () => 'test',
    createOrder: async ({ amountPaise }) => { const o = { id: `order_${crypto.randomBytes(5).toString('hex')}`, amount: amountPaise }; calls.orders.push(o); return o },
    fetchPayment: async () => ({}),
    capturePayment: async () => ({}),
    fetchOrderPayments: async () => [],
    createRefund: async (paymentId, { amountPaise, receipt }) => { const r = { id: `rfnd_${crypto.randomBytes(5).toString('hex')}`, amount: amountPaise }; calls.refunds.push({ paymentId, amountPaise, receipt }); return r },
    listRefunds: async () => [],
    verifyCheckoutSignature: () => true,
    verifyWebhook: () => true,
  }
  setGateway(gw)
  return { gw, calls }
}

export const futureDate = (days) => addDays(new Date().toISOString().slice(0, 10), days)

let n = 0
export async function makeOwner(extra = {}) {
  n++
  return Owner.create({ name: `Owner ${n}`, phone: `+9199000${String(10000 + n)}`, phoneVerified: true, kyc: { status: 'Verified' }, ...extra })
}

// A villa that offers all three booking modes, approved and public
export async function makeVilla(owner, extra = {}) {
  n++
  return Hotel.create({
    name: `Villa ${n}`, owner: owner.name, ownerId: owner._id, city: 'Goa', maxGuests: 10, bedrooms: 3,
    listingStatus: 'Approved', confirmationMode: 'instant', checkInTime: '12:00', checkOutTime: '11:00',
    minNoticeHours: 0, turnoverBufferMinutes: 0,
    pricing: { basePricePaise: 1000000, weekendPricePaise: 1500000, weeklyDiscountPct: 10, monthlyDiscountPct: 20, cleaningFeePaise: 50000 },
    bookingModes: {
      night: { enabled: true, minNights: 1, maxNights: 30 },
      dayUse: { enabled: true, packages: [{ name: 'Pool day', startTime: '10:00', endTime: '18:00', pricePaise: 400000, maxGuests: 8 }] },
      hourly: { enabled: true, openTime: '09:00', closeTime: '21:00', startStepMinutes: 60, durations: [{ minutes: 120, pricePaise: 200000 }, { minutes: 240, pricePaise: 350000 }] },
    },
    ...extra,
  })
}

export async function makeUser(extra = {}) {
  n++
  return User.create({ name: `Guest ${n}`, phone: `+9198000${String(10000 + n)}`, phoneVerified: true, ...extra })
}

export async function setSettings(patch) {
  const s = await Settings.get()
  Object.assign(s, patch)
  await s.save()
  return s
}
