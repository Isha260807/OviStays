import { v2 as cloudinary } from 'cloudinary'
import UploadSetting from '../models/UploadSetting.model.js'

// True when the server has Cloudinary credentials.
export const isCloudinaryConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)

// Provider chosen with the admin toggle ('local' | 'cloudinary'), cached briefly to spare the DB.
const CACHE_MS = 15 * 1000
let providerCache = { value: 'local', expiresAt: 0 }

export async function getUploadProvider() {
  if (providerCache.expiresAt > Date.now()) return providerCache.value
  let value = 'local'
  try {
    const doc = await UploadSetting.findOne({ key: 'singleton' }).lean()
    value = doc?.imageUploadProvider || 'local'
  } catch {
    // DB unavailable: fall back to local storage
  }
  providerCache = { value, expiresAt: Date.now() + CACHE_MS }
  return value
}

export async function setUploadProvider(imageUploadProvider) {
  const doc = await UploadSetting.findOneAndUpdate(
    { key: 'singleton' },
    { imageUploadProvider },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true }
  ).lean()
  providerCache = { value: doc.imageUploadProvider, expiresAt: Date.now() + CACHE_MS }
  return doc.imageUploadProvider
}

// Cloudinary is used only when it is selected AND credentials exist.
export const useCloudinary = async () => isCloudinaryConfigured() && (await getUploadProvider()) === 'cloudinary'

// Credentials can be changed from Env Managements, so configure on every call rather than once.
const configure = () =>
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })

// Streams a buffer to the Cloudinary root (flat, no folders). Returns { url, publicId }.
export function uploadBufferToCloudinary(buffer, { resourceType = 'image', format } = {}) {
  configure()
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, ...(format ? { format } : {}) },
      (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id }))
    )
    stream.end(buffer)
  })
}
