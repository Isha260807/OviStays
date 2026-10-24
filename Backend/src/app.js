import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import { env } from './config/env.js'
import routes from './routes/index.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.corsOrigin, credentials: true }))
app.use(compression())
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
if (env.nodeEnv !== 'test') app.use(morgan('dev'))

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
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value'
    return res.status(409).json({ success: false, message: `${field} already exists` })
  }
  const status = err.status || 500
  if (status >= 500) console.error(err)
  res.status(status).json({ success: false, message: status >= 500 ? 'Server error' : err.message })
})

export default app
