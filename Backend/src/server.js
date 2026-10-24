import app from './app.js'
import { env } from './config/env.js'
import { connectDB } from './config/db.js'

async function start() {
  await connectDB()
  app.listen(env.port, () => console.log(`API running on port ${env.port}`))
}

start().catch((err) => {
  console.error('Failed to start server', err)
  process.exit(1)
})
