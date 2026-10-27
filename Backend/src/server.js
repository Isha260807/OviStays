import app from './app.js'
import { env } from './config/env.js'
import { connectDB } from './config/db.js'
import { loadEnvFromDb } from './config/envLoader.js'
import { startScheduler } from './core/jobs/scheduler.js'

async function start() {
  await connectDB()
  await loadEnvFromDb()
  app.listen(env.port, () => console.log(`API running on port ${env.port}`))
  startScheduler()
}

start().catch((err) => {
  console.error('Failed to start server', err)
  process.exit(1)
})
