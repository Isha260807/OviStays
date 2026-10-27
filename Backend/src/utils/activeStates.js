import Location from '../models/Location.model.js'

// The states the admin has added and left Active. Villas outside them are not shown to guests and cannot be booked.
// The list is kept for a few seconds so busy pages do not ask the database every time.
const CACHE_MS = 10 * 1000
let cache = { states: [], expiresAt: 0 }

export async function activeStates() {
  if (cache.expiresAt > Date.now()) return cache.states
  const docs = await Location.find({ status: 'Active' }).select('state').lean()
  cache = { states: docs.map((d) => d.state), expiresAt: Date.now() + CACHE_MS }
  return cache.states
}

// Call after an admin changes a location so the change shows at once
export const forgetActiveStates = () => { cache.expiresAt = 0 }

// A filter to add to a Hotel query: only villas in an Active state
export async function inActiveState() {
  return { state: { $in: await activeStates() } }
}

// True when a villa document sits in an Active state
export async function isInActiveState(villa) {
  return (await activeStates()).includes(villa?.state)
}
