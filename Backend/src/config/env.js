import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'dotenv'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

// Values exactly as written in the .env file, so an override saved from the admin panel can be undone.
export const fileEnv = (() => {
  try {
    return parse(fs.readFileSync(path.join(backendRoot, '.env')))
  } catch {
    return {}
  }
})()

const read = () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/OviStays',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  corsOrigin: process.env.FRONTEND_URL || 'http://localhost:5173',
  otpMode: process.env.OTP_MODE === 'real' ? 'real' : 'demo', // demo = fixed 123456, real = random code sent by SMS
})

export const env = read()

// Re-reads process.env into `env`. Called after values are changed from the admin panel.
export const refreshEnv = () => Object.assign(env, read())
