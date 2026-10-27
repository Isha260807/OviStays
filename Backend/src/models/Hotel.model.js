import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'
import { IMAGE_PATH_PATTERN, IMAGE_PATH_MESSAGE } from '../utils/uploadPaths.js'

export const HOTEL_STATUSES = ['Active', 'Pending', 'Suspended', 'Inactive']
// Where a villa is in its life. `status` is what the public sees (Active = bookable); listingStatus is the workflow.
export const LISTING_STATUSES = ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Inactive', 'Suspended']
export const CONFIRMATION_MODES = ['instant', 'request']
const LISTING_TO_STATUS = { Approved: 'Active', Suspended: 'Suspended', Inactive: 'Inactive', Draft: 'Pending', 'Pending Approval': 'Pending', Rejected: 'Pending' }
const STATUS_TO_LISTING = { Active: 'Approved', Suspended: 'Suspended', Inactive: 'Inactive', Pending: 'Pending Approval' }
const paise = { type: Number, default: 0, min: 0, validate: { validator: Number.isInteger, message: 'Amounts must be whole paise' } }
const hhmm = (def) => ({ type: String, default: def, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must look like 14:30'] })
export const HIGHLIGHT_ICONS = ['bed', 'bath', 'guests', 'wifi', 'parking', 'pool', 'ac', 'kitchen']

const image = { type: String, trim: true, default: '', match: [new RegExp(IMAGE_PATH_PATTERN.source + '|^$'), IMAGE_PATH_MESSAGE] }
const maxItems = (n) => ({ validator: (v) => v.length <= n, message: 'At most ' + n + ' items allowed' })

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, required: true, trim: true, index: true },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
    coverImage: { type: String, trim: true, default: '', match: [IMAGE_PATH_PATTERN, IMAGE_PATH_MESSAGE] },
    rooms: { type: Number, default: 0, min: 0 },
    startingPrice: { type: Number, default: 0, min: 0 },
    checkInTime: { type: String, default: '12:00' },
    checkOutTime: { type: String, default: '11:00' },
    rating: { type: Number, default: 0, min: 0, max: 5 },

    // Villa details page (edited in Admin > Hotels > Edit details)
    propertyType: { type: String, trim: true, default: 'Private Villa', maxlength: 40 },
    bedrooms: { type: Number, default: 0, min: 0, max: 50 },
    bathrooms: { type: Number, default: 0, min: 0, max: 50 },
    maxGuests: { type: Number, default: 0, min: 0, max: 200 },
    gallery: { type: [{ url: image, category: { type: String, trim: true, default: 'Exterior', maxlength: 30 }, _id: false }], validate: maxItems(60) },
    amenities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Amenity' }],
    highlights: { type: [{ icon: { type: String, enum: HIGHLIGHT_ICONS, default: 'bed' }, title: { type: String, trim: true, maxlength: 30 }, subtitle: { type: String, trim: true, default: '', maxlength: 30 }, _id: false }], validate: maxItems(3) },
    spaces: { type: [{ name: { type: String, trim: true, maxlength: 40 }, details: { type: String, trim: true, default: '', maxlength: 120 }, image, _id: false }], validate: maxItems(20) },
    videoUrl: { type: String, trim: true, default: '' },
    cancellationPolicy: { type: String, trim: true, default: '', maxlength: 200 },
    paymentInfo: { type: String, trim: true, default: '', maxlength: 120 },
    mapUrl: { type: String, trim: true, default: '', match: [/^(https:\/\/\S+)?$/, 'Map link must be an https URL'] },
    houseRules: { type: [{ type: String, trim: true, maxlength: 150 }], default: [], validate: maxItems(20) },

    // Ownership and approval
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', index: true },
    listingStatus: { type: String, enum: LISTING_STATUSES },
    rejectionReason: { type: String, default: '' },
    submittedAt: Date,
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    // Location on the map (GeoJSON: [longitude, latitude])
    geo: { type: { type: String, enum: ['Point'] }, coordinates: { type: [Number] } },
    locality: { type: String, trim: true, default: '', maxlength: 80 },
    country: { type: String, trim: true, default: 'India', maxlength: 60 },
    beds: { type: Number, default: 0, min: 0, max: 100 },

    // Booking set-up
    timezone: { type: String, default: 'Asia/Kolkata' },
    confirmationMode: { type: String, enum: CONFIRMATION_MODES, default: 'instant' },
    allowSameDay: { type: Boolean, default: true }, // tonight can still be booked after the usual check-in time has passed
    maxAdvanceDays: { type: Number, default: 365, min: 1, max: 730 },
    pricing: {
      basePricePaise: paise, // per night; 0 = fall back to startingPrice
      weekendPricePaise: paise, // Fri and Sat nights; 0 = same as base
      weeklyDiscountPct: { type: Number, default: 0, min: 0, max: 90 }, // 7+ nights
      monthlyDiscountPct: { type: Number, default: 0, min: 0, max: 90 }, // 28+ nights
      cleaningFeePaise: paise,
    },
    bookingModes: {
      night: {
        enabled: { type: Boolean, default: true },
        minNights: { type: Number, default: 1, min: 1, max: 365 },
        maxNights: { type: Number, default: 30, min: 1, max: 365 },
      },
      dayUse: {
        enabled: { type: Boolean, default: false },
        packages: {
          type: [{ name: { type: String, required: true, trim: true, maxlength: 40 }, startTime: hhmm('10:00'), endTime: hhmm('18:00'), pricePaise: paise, maxGuests: { type: Number, default: 0, min: 0 } }],
          default: [],
          validate: maxItems(10),
        },
      },
      hourly: {
        enabled: { type: Boolean, default: false },
        openTime: hhmm('09:00'),
        closeTime: hhmm('21:00'),
        startStepMinutes: { type: Number, default: 60, min: 15, max: 240 },
        // Pay-per-hour: the guest picks any whole number of hours between minHours and maxHours
        pricePerHourPaise: paise,
        minHours: { type: Number, default: 1, min: 1, max: 24 },
        maxHours: { type: Number, default: 12, min: 1, max: 24 },
        durations: {
          type: [{ minutes: { type: Number, required: true, min: 30, max: 720 }, pricePaise: paise, _id: false }],
          default: [],
          validate: maxItems(8),
        },
      },
    },

    // Short lease that serialises bookings on one villa, so two guests can never take the same time
    calendarLockUntil: { type: Date, default: null },
    calendarLockToken: { type: String, default: '' },

    status: { type: String, enum: HOTEL_STATUSES, default: 'Pending', index: true },
  },
  { timestamps: true }
)

hotelSchema.plugin(codePlugin, { prefix: 'HT' })
hotelSchema.index({ geo: '2dsphere' }, { sparse: true })

// status (public visibility) and listingStatus (workflow) always move together: whichever one was
// changed decides the other, and a legacy villa with no listingStatus gets one.
hotelSchema.pre('validate', function () {
  if (!this.geo?.coordinates?.length) this.geo = undefined
  if (!this.listingStatus) {
    this.listingStatus = STATUS_TO_LISTING[this.status] || 'Pending Approval'
  } else if (this.isModified('status') && !this.isModified('listingStatus')) {
    this.listingStatus = STATUS_TO_LISTING[this.status] || this.listingStatus
  } else {
    this.status = LISTING_TO_STATUS[this.listingStatus] || 'Pending'
  }
})

export default mongoose.models.Hotel || mongoose.model('Hotel', hotelSchema)
