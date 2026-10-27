// Creates a verified villa owner so the owner panel can be tried straight away (demo OTP is 123456).
// Usage: npm run seed:owner -- "+91 9000000001" "Owner Name" [hotelRefId ...]
// Any hotel ref ids given (HT-0001 ...) are handed over to this owner.
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'
import Owner from '../src/modules/hotel/models/Owner.model.js'
import Hotel from '../src/models/Hotel.model.js'
import { normalizePhone } from '../src/modules/user/services/otp.service.js'

const [, , phoneArg = '+91 9000000001', nameArg = 'Demo Owner', ...refIds] = process.argv
const phone = normalizePhone(phoneArg)

await connectDB()
let owner = await Owner.findOne({ phone })
if (!owner) owner = new Owner({ name: nameArg, phone })
owner.phoneVerified = true
owner.status = 'Active'
owner.kyc = { ...(owner.kyc?.toObject?.() || {}), status: 'Verified', panNumber: 'ABCDE1234F', panName: nameArg, verifiedAt: new Date() }
owner.bank = { holderName: nameArg, last4: '9012', ifsc: 'HDFC0001234', bankName: 'HDFC Bank' }
await owner.save()
console.log(`Owner ${owner.refId} ready: ${phone}`)

for (const ref of refIds) {
  const res = await Hotel.updateOne({ refId: ref }, { ownerId: owner._id, owner: owner.name })
  console.log(res.matchedCount ? `Villa ${ref} now belongs to this owner` : `Villa ${ref} not found`)
}
await mongoose.disconnect()
