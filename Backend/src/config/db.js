import mongoose from 'mongoose'
import { env } from './env.js'

// The app has one database, MongoDB Atlas, set by MONGO_URI in .env. The link must name the database
// (.../OviStays?...): without a name MongoDB quietly uses one called "test".
export async function connectDB() {
  if (!env.mongoUri) throw new Error('MONGO_URI is not set. Add the MongoDB Atlas link to Backend/.env')
  if (!/^mongodb(\+srv)?:\/\/[^/]+\/[^/?\s]+/.test(env.mongoUri)) {
    throw new Error('MONGO_URI has no database name. Put it before the "?", for example ...mongodb.net/OviStays?retryWrites=true')
  }
  await mongoose.connect(env.mongoUri)
  console.log(`MongoDB connected (database: ${mongoose.connection.name})`)
}
