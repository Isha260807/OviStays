import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../auth/auth.middleware.js'
import { badRequest } from '../../utils/httpError.js'
import {
  saveImage, savePdf, saveVideo, IMAGE_PRESETS, IMAGE_MIME_TYPES, VIDEO_MIME_TYPES,
} from './upload.service.js'

const MB = 1024 * 1024

// Files are held in memory, processed, then written by the service.
const memoryUpload = (maxMb, allowedMimeTypes, message) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * MB, files: 1 },
    fileFilter: (req, file, cb) =>
      allowedMimeTypes.includes(file.mimetype) ? cb(null, true) : cb(badRequest(message)),
  }).single('file')

const imageUpload = memoryUpload(5, IMAGE_MIME_TYPES, 'Only JPEG, PNG, WebP and GIF images are allowed')
const pdfUpload = memoryUpload(10, ['application/pdf'], 'Only PDF files are allowed')
const videoUpload = memoryUpload(50, VIDEO_MIME_TYPES, 'Only MP4, WebM and MOV videos are allowed')

const requireFile = (req) => {
  if (!req.file?.buffer) throw badRequest('No file provided')
}

const router = Router()
// Any signed-in account may upload; anonymous uploads are not accepted.
router.use(authenticate)

// POST /api/uploads/image   multipart: file, type (hotel | room | banner | profile | misc)
router.post('/image', imageUpload, async (req, res) => {
  requireFile(req)
  const type = Object.hasOwn(IMAGE_PRESETS, req.body?.type) ? req.body.type : 'misc'
  res.json({ success: true, message: 'Image uploaded successfully', data: await saveImage(req.file.buffer, type) })
})

// POST /api/uploads/file   multipart: file (PDF only)
router.post('/file', pdfUpload, async (req, res) => {
  requireFile(req)
  res.json({ success: true, message: 'File uploaded successfully', data: await savePdf(req.file.buffer) })
})

// POST /api/uploads/video   multipart: file
router.post('/video', videoUpload, async (req, res) => {
  requireFile(req)
  res.json({ success: true, message: 'Video uploaded successfully', data: await saveVideo(req.file.buffer, req.file.mimetype) })
})

export default router
