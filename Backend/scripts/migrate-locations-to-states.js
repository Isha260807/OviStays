// Locations used to be a city plus its state; they are now just the state. This merges the old records
// (one per state, keeping the oldest and its image), removes the city field and its unique index, and adds any
// state that villas already use but the list was missing, so no villa disappears.
// Usage:  node scripts/migrate-locations-to-states.js           (dry run: only shows what would change)
//         node scripts/migrate-locations-to-states.js --apply
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'
import Location from '../src/models/Location.model.js'

const APPLY = process.argv.includes('--apply')
await connectDB()
const db = mongoose.connection.db
const locations = db.collection('locations')
const hotels = db.collection('hotels')

const old = await locations.find({}).sort({ createdAt: 1 }).toArray()
const byState = new Map()
for (const l of old) {
  const key = String(l.state || '').trim().toLowerCase()
  if (!key) continue
  if (!byState.has(key)) byState.set(key, [])
  byState.get(key).push(l)
}

const plan = []
for (const group of byState.values()) {
  const keep = group[0]
  const image = group.map((g) => g.image).find(Boolean) || ''
  // one state is Inactive only when every city in it was
  const status = group.some((g) => g.status !== 'Inactive') ? 'Active' : 'Inactive'
  plan.push({ action: group.length > 1 || keep.city !== undefined ? 'merge' : 'keep', state: keep.state.trim(), from: group.map((g) => g.city || '(state only)').join(', '), keepId: keep._id, removeIds: group.slice(1).map((g) => g._id), image, status })
}
const known = new Set(plan.map((p) => p.state.toLowerCase()))
const villaStates = (await hotels.distinct('state')).map((s) => String(s || '').trim()).filter(Boolean)
const missing = villaStates.filter((s) => !known.has(s.toLowerCase()))

console.log('States after the change:')
console.table(plan.map((p) => ({ state: p.state, mergedFrom: p.from, status: p.status })))
if (missing.length) console.log('Added because villas already use them:', missing.join(', '))

if (!APPLY) {
  console.log('Dry run: nothing was changed. Run again with --apply.')
  await mongoose.disconnect()
  process.exit(0)
}

for (const p of plan) {
  await locations.updateOne({ _id: p.keepId }, { $set: { state: p.state, image: p.image, status: p.status }, $unset: { city: '' } })
  if (p.removeIds.length) await locations.deleteMany({ _id: { $in: p.removeIds } })
}
// created through the model so each gets its LC- code
for (const state of missing) await Location.create({ state })
try { await locations.dropIndex('city_1') } catch { /* index already gone */ }
await locations.createIndex({ state: 1 }, { unique: true })
console.log('Done.')
await mongoose.disconnect()
