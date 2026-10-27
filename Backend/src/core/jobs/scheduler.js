import { runBookingJobs } from '../../modules/user/services/booking.service.js'

// Background housekeeping: lapsing holds, owner timeouts, no-shows, auto check-out, refund retries and
// payment reconciliation. Every step claims its rows with an atomic update, so running this on several
// servers at once is safe.
const EVERY_MS = 30 * 1000
let running = false
let timer = null

export async function tick() {
  if (running) return null
  running = true
  try {
    return await runBookingJobs()
  } catch (err) {
    console.error('Background job failed:', err)
    return null
  } finally {
    running = false
  }
}

export function startScheduler() {
  if (timer) return
  timer = setInterval(tick, EVERY_MS)
  timer.unref()
  console.log('Background jobs started')
}

export function stopScheduler() {
  clearInterval(timer)
  timer = null
}
