import mongoose from 'mongoose'
import { IMAGE_PATH_PATTERN, IMAGE_PATH_MESSAGE } from '../utils/uploadPaths.js'

// A stored file: `url` is a relative /uploads path or an https URL; `publicId` is set for Cloudinary files.
const imageField = {
  url: { type: String, trim: true, default: '', match: [IMAGE_PATH_PATTERN, IMAGE_PATH_MESSAGE] },
  publicId: { type: String, default: '' },
}
const FILE_PATH_PATTERN = /^(\/uploads\/[\w.-]+\.pdf|https:\/\/\S+)$/
const fileField = {
  url: { type: String, trim: true, default: '', match: [FILE_PATH_PATTERN, 'Document must be an uploaded PDF or an https URL'] },
  publicId: { type: String, default: '' },
}

// Single document holding platform-wide business settings (Admin > System Settings > Business Setup).
const settingsSchema = new mongoose.Schema(
  {
    // Company information
    companyName: { type: String, default: 'OviStays', trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 100 },
    phoneCountryCode: { type: String, default: '+91', trim: true },
    phoneNumber: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true, maxlength: 250 },
    state: { type: String, default: '', trim: true, maxlength: 50 },
    pincode: { type: String, default: '', trim: true },
    region: { type: String, default: 'India', trim: true },
    gstin: { type: String, default: '', trim: true, uppercase: true, maxlength: 15 },

    // Support information (shown on the public support page)
    supportEmail: { type: String, default: '', trim: true, lowercase: true },
    supportPhone: { type: String, default: '', trim: true },
    supportHours: { type: String, default: '24/7 Availability', trim: true, maxlength: 100 },

    // Branding
    logo: imageField, // main logo (admin panel and default everywhere)
    userLogo: imageField, // guest app
    hotelLogo: imageField, // hotel panel
    favicon: imageField,
    termsAndConditionsPdf: fileField, // shown to hotels during onboarding

    // Pricing and tax. Used when a booking is created to work out commission, fee and GST.
    currency: { type: String, enum: ['INR', 'USD'], default: 'INR' },
    commissionRate: { type: Number, default: 10, min: 0, max: 100 },
    platformFee: { type: Number, default: 0, min: 0 },
    gstRate: { type: Number, default: 12, min: 0, max: 100 },
    cancelHours: { type: Number, default: 24, min: 0 },

    // Booking rules (Admin > System Settings > Booking & Refund Rules)
    stayGstRate: { type: Number, default: 12, min: 0, max: 100 }, // GST charged to the guest on the stay
    instantHoldMinutes: { type: Number, default: 15, min: 5, max: 120 }, // how long an instant booking waits for payment
    ownerResponseHours: { type: Number, default: 12, min: 1, max: 72 }, // how long an owner has to accept or reject a request
    payWindowMinutes: { type: Number, default: 120, min: 10, max: 1440 }, // time the guest gets to pay after the owner accepts
    checkInOpensHours: { type: Number, default: 3, min: 0, max: 48 }, // the check-in code works from this long before the start
    noShowGraceHours: { type: Number, default: 12, min: 0, max: 72 }, // after the end, an unused booking becomes a no-show
    autoCheckoutGraceHours: { type: Number, default: 2, min: 0, max: 48 },
    // Cancelling at least `hoursBeforeStart` hours before the start refunds `refundPercent` of what was paid.
    // The tier with the largest matching hoursBeforeStart wins; cancelling later than every tier refunds nothing.
    refundTiers: {
      type: [{ hoursBeforeStart: { type: Number, required: true, min: 0 }, refundPercent: { type: Number, required: true, min: 0, max: 100 }, _id: false }],
      default: () => [{ hoursBeforeStart: 72, refundPercent: 100 }, { hoursBeforeStart: 24, refundPercent: 50 }],
    },

    // Feature toggles (Admin > System Settings > Toggle Management)
    onlinePaymentOnly: { type: Boolean, default: false }, // turns pay-at-hotel off everywhere
    maxPayAtHotelAmount: { type: Number, default: 0, min: 0 }, // pay-at-hotel is refused above this amount; 0 = no limit
    maintenanceMode: { type: Boolean, default: false }, // suspends new guest bookings
    userRegistration: { type: Boolean, default: true }, // new guests can sign up
    hotelRegistration: { type: Boolean, default: true }, // new hotels can apply to join
    authAssets: {
      welcomeTravelerImage: { type: String, default: '/assets/auth/traveler_hero.jpg' },
      welcomeCard1: { type: String, default: '/assets/auth/card_beach.jpg' },
      welcomeCard2: { type: String, default: '/assets/auth/card_pool.jpg' },
      welcomeCard3: { type: String, default: '/assets/auth/card_patio.jpg' },
      authHeroBanner: { type: String, default: '/assets/auth/hotel_hero.jpg' },
      tagText: { type: String, default: '#Luxury' },
      welcomeTitle: { type: String, default: 'Find your perfect stay anywhere in the world' },
      welcomeSubtitle: { type: String, default: 'Find and book exceptional private villas with a seamless and reliable booking experience.' },
      authTagline: { type: String, default: 'Your Dream Villa Awaits.' },
      authSubtagline: { type: String, default: 'Book private villas and enjoy comfortable stays with family & friends at great prices.' },
    },
  },
  { timestamps: true }
)

settingsSchema.statics.get = async function () {
  return (await this.findOne()) || (await this.create({}))
}

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema)
