// Creates a guest account so it can log in straight away (demo OTP is 123456 for every number).
// Usage: npm run seed:user -- "+91 8817921168" "Guest Name"
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'
import User from '../src/modules/user/models/User.model.js'
import { normalizePhone } from '../src/modules/user/services/otp.service.js'

const phone = normalizePhone(process.argv[2] || '+91 8817921168')
const name = process.argv[3] || 'Guest Traveler'

await connectDB()
let user = await User.findOne({ phone })
if (user) {
  user.phoneVerified = true
  user.status = 'Active'
  await user.save()
  console.log(`Updated user ${phone}`)
} else {
  await User.create({ name, phone, phoneVerified: true })
  console.log(`Created user ${phone}`)
}
await mongoose.disconnect()
