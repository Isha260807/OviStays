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
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' })
})

export default app
