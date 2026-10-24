import 'dotenv/config'

// Mirrors Grhapoch: MONGO_ENV picks between local and production URIs.
const mongoEnv = process.env.MONGO_ENV || 'local'
const mongoUri =
  (mongoEnv === 'production' ? process.env.MONGO_URI_PRODUCTION : process.env.MONGO_URI_LOCAL) ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/OviStays'

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  corsOrigin: process.env.FRONTEND_URL || 'http://localhost:5173',
}
