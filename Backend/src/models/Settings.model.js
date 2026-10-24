import mongoose from 'mongoose'

// Single document holding platform-wide business settings.
const settingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'OviStays', trim: true },
    email: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    currency: { type: String, enum: ['INR', 'USD'], default: 'INR' },
    commissionRate: { type: Number, default: 10, min: 0, max: 100 },
    platformFee: { type: Number, default: 0, min: 0 },
    gstRate: { type: Number, default: 12, min: 0, max: 100 },
    cancelHours: { type: Number, default: 24, min: 0 },
  },
  { timestamps: true }
)

settingsSchema.statics.get = async function () {
  return (await this.findOne()) || (await this.create({}))
}

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema)
