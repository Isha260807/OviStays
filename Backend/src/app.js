import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import { env } from './config/env.js'
import { resolveUploadRoot } from './utils/uploadPaths.js'
import routes from './routes/index.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.corsOrigin, credentials: true }))
app.use(compression())
// The payment webhook is signed over the exact bytes received, so those are kept next to the parsed body
app.use(express.json({ limit: '2mb', verify: (req, res, buf) => { if (req.originalUrl.startsWith('/api/payments/')) req.rawBody = buf } }))
app.use(express.urlencoded({ extended: true }))
if (env.nodeEnv !== 'test') app.use(morgan('dev'))

// Uploaded files. Cross-origin is allowed so the web app on another port/domain can show them;
// helmet already sends nosniff, and only processed WebP / PDF / video are ever written here.
// The folder is looked up per request because UPLOAD_PATH can be changed from Env Managements.
let uploadsStatic = { root: null, handler: null }
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  const root = resolveUploadRoot()
  if (uploadsStatic.root !== root) {
    uploadsStatic = { root, handler: express.static(root, { index: false, dotfiles: 'deny', maxAge: '30d', immutable: true }) }
  }
  uploadsStatic.handler(req, res, next)
})

app.use('/api', routes)

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }))

// Turns thrown errors into JSON: validation -> 400, duplicate key -> 409, HttpError -> its own status
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join(', ')
    return res.status(400).json({ success: false, message })
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid value for ${err.path}` })
  }
  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, message })
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value'
    return res.status(409).json({ success: false, message: `${field} already exists` })
  }
  const status = err.status || 500
  if (status >= 500) console.error(err)
  res.status(status).json({ success: false, message: status >= 500 ? 'Server error' : err.message, ...(status < 500 && err.extra ? { data: err.extra } : {}) })
})

export default app
