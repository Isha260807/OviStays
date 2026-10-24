import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'
import { resolveUploadRoot } from '../../utils/uploadPaths.js'
import { useCloudinary, uploadBufferToCloudinary } from '../../utils/cloudinary.js'
import { badRequest } from '../../utils/httpError.js'

// Size and name prefix per kind of image. Everything is converted to WebP.
export const IMAGE_PRESETS = {
  hotel: { prefix: 'hotel', width: 1200, height: 800 },
  room: { prefix: 'room', width: 1200, height: 800 },
  banner: { prefix: 'banner', width: 1600, height: 600 },
  profile: { prefix: 'user', width: 400, height: 400 },
  logo: { prefix: 'logo', width: 600, height: 600 },
  favicon: { prefix: 'favicon', width: 128, height: 128 },
  misc: { prefix: 'img' },
}
const QUALITY = 85
const MAX_INPUT_PIXELS = 40_000_000 // refuses decompression bombs

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const VIDEO_EXTENSIONS = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' }
export const VIDEO_MIME_TYPES = Object.keys(VIDEO_EXTENSIONS)

// All files live flat in one folder: <prefix>_<random>.<ext>. The client's filename is never used.
const flatName = (prefix, ext) => `${prefix}_${crypto.randomBytes(5).toString('hex')}.${ext}`

async function writeLocal(prefix, ext, buffer) {
  const dir = resolveUploadRoot()
  await fs.mkdir(dir, { recursive: true })
  const filename = flatName(prefix, ext)
  await fs.writeFile(path.join(dir, filename), buffer)
  return `/uploads/${filename}`
}

/**
 * Resizes and converts an image to WebP, then stores it locally or on Cloudinary.
 * sharp rejects anything that is not really an image, so the browser-reported type is not trusted.
 * Returns { url, provider, publicId? }; `url` is a relative /uploads path for local storage.
 */
export async function saveImage(buffer, type = 'misc') {
  const preset = IMAGE_PRESETS[type] || IMAGE_PRESETS.misc
  let processed
  try {
    let img = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).rotate() // .rotate() applies EXIF orientation
    if (preset.width || preset.height) {
      img = img.resize({ width: preset.width, height: preset.height, fit: 'inside', withoutEnlargement: true })
    }
    processed = await img.webp({ quality: QUALITY }).toBuffer() // metadata (incl. GPS) is dropped
  } catch {
    throw badRequest('The file is not a valid image')
  }

  if (await useCloudinary()) {
    const { url, publicId } = await uploadBufferToCloudinary(processed)
    return { url, publicId, provider: 'cloudinary' }
  }
  return { url: await writeLocal(preset.prefix, 'webp', processed), provider: 'local' }
}

const startsWith = (buffer, bytes, offset = 0) => bytes.every((b, i) => buffer[offset + i] === b)

export async function savePdf(buffer) {
  if (!startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) throw badRequest('The file is not a valid PDF') // "%PDF-"
  if (await useCloudinary()) {
    const { url, publicId } = await uploadBufferToCloudinary(buffer, { resourceType: 'raw', format: 'pdf' })
    return { url, publicId, provider: 'cloudinary' }
  }
  return { url: await writeLocal('file', 'pdf', buffer), provider: 'local' }
}

export async function saveVideo(buffer, mimetype) {
  const ext = VIDEO_EXTENSIONS[mimetype]
  const isIsoMedia = startsWith(buffer, [0x66, 0x74, 0x79, 0x70], 4) // "ftyp" box (mp4 / mov)
  const isWebm = startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3]) // EBML header
  if (!ext || !(ext === 'webm' ? isWebm : isIsoMedia)) throw badRequest('The file is not a valid video')
  if (await useCloudinary()) {
    const { url, publicId } = await uploadBufferToCloudinary(buffer, { resourceType: 'video' })
    return { url, publicId, provider: 'cloudinary' }
  }
  return { url: await writeLocal('video', ext, buffer), provider: 'local' }
}

// Keeps only the relative path (/uploads/<file>) for local files, whatever host the URL carried,
// so stored values keep working when the domain changes. Remote (Cloudinary) URLs are left alone.
export function normalizeStoredUploadPath(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return trimmed
      return normalizeStoredUploadPath(url.pathname)
    } catch {
      return trimmed
    }
  }
  const filename = path.posix.basename(trimmed.split(/[?#]/)[0].replace(/\\/g, '/'))
  return filename && filename !== '.' ? `/uploads/${filename}` : ''
}
