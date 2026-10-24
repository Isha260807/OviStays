// Creates (or resets the password of) the main admin account.
// Usage: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD=secret123 npm run seed:admin
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'
import Admin from '../src/modules/admin/models/Admin.model.js'

const email = (process.env.ADMIN_EMAIL || 'admin@ovistays.com').toLowerCase()
const password = process.env.ADMIN_PASSWORD
if (!password || password.length < 8) {
  console.error('Set ADMIN_PASSWORD (min 8 characters) in .env or the command line')
  process.exit(1)
}

await connectDB()
let admin = await Admin.findOne({ email })
if (admin) {
  admin.passwordHash = await Admin.hashPassword(password)
  admin.role = 'ADMIN'
  admin.status = 'Active'
  await admin.save()
  console.log(`Updated admin ${email}`)
} else {
  await Admin.create({ name: 'Super Admin', email, passwordHash: await Admin.hashPassword(password), role: 'ADMIN' })
  console.log(`Created admin ${email}`)
}
await mongoose.disconnect()
