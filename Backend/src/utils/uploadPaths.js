import path from 'path'
import { fileURLToPath } from 'url'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

// Where local uploads are written and served from.
// UPLOAD_DIR / UPLOAD_PATH win; otherwise development uses Backend/uploads and production uses
// /var/www/uploads, outside the app folder so deploys never overwrite user files.
export const defaultUploadRoot = () =>
  process.env.NODE_ENV === 'production' ? '/var/www/uploads' : path.join(backendRoot, 'uploads')

// What a stored image field may hold: one of our own uploads, or an https URL (Cloudinary).
export const IMAGE_PATH_PATTERN = /^(\/uploads\/[\w.-]+|https:\/\/\S+)$/
export const IMAGE_PATH_MESSAGE = 'Image must be an uploaded file or an https URL'

export const resolveUploadRoot = () =>
  path.resolve(process.env.UPLOAD_DIR || process.env.UPLOAD_PATH || defaultUploadRoot())
