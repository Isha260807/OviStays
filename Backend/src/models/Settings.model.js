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
    authAssets: {
      welcomeTravelerImage: { type: String, default: '/assets/auth/traveler_hero.jpg' },
      welcomeCard1: { type: String, default: '/assets/auth/card_beach.jpg' },
      welcomeCard2: { type: String, default: '/assets/auth/card_pool.jpg' },
      welcomeCard3: { type: String, default: '/assets/auth/card_patio.jpg' },
      authHeroBanner: { type: String, default: '/assets/auth/hotel_hero.jpg' },
      tagText: { type: String, default: '#Luxury' },
      welcomeTitle: { type: String, default: 'Find your perfect stay anywhere in the world' },
      welcomeSubtitle: { type: String, default: 'Find and reserve exceptional stays worldwide with a seamless and reliable booking experience.' },
      authTagline: { type: String, default: 'Your Perfect Stay Awaits.' },
      authSubtagline: { type: String, default: 'Book the best hotels and enjoy comfortable stays at great prices.' },
    },
  },
  { timestamps: true }
)

settingsSchema.statics.get = async function () {
  return (await this.findOne()) || (await this.create({}))
}

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema)
