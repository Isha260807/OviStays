import mongoose from 'mongoose'
import { IMAGE_PATH_PATTERN, IMAGE_PATH_MESSAGE } from '../utils/uploadPaths.js'

// Content pages edited in Admin > Pages & Social Media. One document per page `key`.
export const LEGAL_PAGES = {
  terms: 'Terms and Conditions',
  terms_hotel: 'Terms and Conditions - Hotel',
  privacy: 'Privacy Policy',
  privacy_hotel: 'Privacy Policy - Hotel',
  refund: 'Refund Policy',
  cancellation: 'Cancellation Policy',
}
export const PAGE_KEYS = [...Object.keys(LEGAL_PAGES), 'about', 'social']
export const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'x', 'youtube', 'linkedin', 'whatsapp', 'telegram']

const featureSchema = new mongoose.Schema(
  {
    icon: { type: String, default: 'Heart' },
    title: { type: String, default: '', maxlength: 100 },
    description: { type: String, default: '', maxlength: 500 },
    color: { type: String, default: '' },
    bgColor: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: false }
)

const pageContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, enum: PAGE_KEYS },

    // Legal pages: `content` is the plain text the admin typed (HTML is generated from it when served)
    title: { type: String, default: '', trim: true, maxlength: 150 },
    content: { type: String, default: '', maxlength: 100000 },

    about: {
      appName: { type: String, default: '', trim: true, maxlength: 60 },
      version: { type: String, default: '', trim: true, maxlength: 20 },
      description: { type: String, default: '', trim: true, maxlength: 2000 },
      logo: { type: String, default: '', trim: true, match: [IMAGE_PATH_PATTERN, IMAGE_PATH_MESSAGE] },
      features: { type: [featureSchema], default: [] },
    },

    social: {
      links: [
        new mongoose.Schema(
          {
            platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
            url: { type: String, required: true, trim: true, match: [/^https:\/\/\S+$/, 'Links must start with https://'] },
          },
          { _id: false }
        ),
      ],
    },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
)

export default mongoose.models.PageContent || mongoose.model('PageContent', pageContentSchema)
