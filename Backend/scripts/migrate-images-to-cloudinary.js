// Moves every image that is saved as an Unsplash link to Cloudinary, and updates the database to the new links.
// Cloudinary downloads each image itself, so this does not depend on the speed of your own internet.
// Safe to run again: an image is uploaded once (same link -> same Cloudinary name) and links already on Cloudinary are skipped.
// Usage:  node scripts/migrate-images-to-cloudinary.js           (dry run: only lists what would change)
//         node scripts/migrate-images-to-cloudinary.js --apply   (uploads and updates the database)
import 'dotenv/config'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { v2 as cloudinary } from 'cloudinary'
import { connectDB } from '../src/config/db.js'
import { isCloudinaryConfigured } from '../src/utils/cloudinary.js'

const APPLY = process.argv.includes('--apply')
const SOURCE = /^https:\/\/images\.unsplash\.com\//
const CONCURRENCY = 4

if (!isCloudinaryConfigured()) {
  console.error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in Backend/.env')
  process.exit(1)
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

const isPlain = (v) => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype

// Every Unsplash link found anywhere inside a value (nested objects and arrays)
function collect(value, out) {
  if (typeof value === 'string') { if (SOURCE.test(value)) out.add(value) } else if (Array.isArray(value)) value.forEach((v) => collect(v, out))
  else if (isPlain(value)) Object.values(value).forEach((v) => collect(v, out))
}

// A copy of the value with links replaced; ObjectIds, dates and everything else are left as they are
function replace(value, map) {
  if (typeof value === 'string') return map.get(value) ?? value
  if (Array.isArray(value)) return value.map((v) => replace(v, map))
  if (isPlain(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replace(v, map)]))
  return value
}

async function toCloudinary(url) {
  const publicId = `unsplash_${crypto.createHash('sha1').update(url).digest('hex').slice(0, 14)}`
  const res = await cloudinary.uploader.upload(url, { public_id: publicId, overwrite: false, resource_type: 'image' })
  // f_auto and q_auto let Cloudinary send the smallest format the browser supports
  return res.secure_url.replace('/upload/', '/upload/f_auto,q_auto/')
}

await connectDB()
const db = mongoose.connection.db
const collections = (await db.listCollections().toArray()).map((c) => c.name).filter((n) => !n.startsWith('system.'))

// 1. find the links
const found = [] // { name, doc, urls }
const unique = new Set()
for (const name of collections) {
  for await (const doc of db.collection(name).find({})) {
    const urls = new Set()
    collect(doc, urls)
    if (urls.size) { found.push({ name, doc, urls }); urls.forEach((u) => unique.add(u)) }
  }
}
console.log(`Found ${unique.size} different Unsplash images in ${found.length} records:`)
const perCollection = {}
for (const f of found) perCollection[f.name] = (perCollection[f.name] || 0) + 1
console.table(perCollection)

if (!APPLY) {
  console.log('Dry run: nothing was changed. Run again with --apply to upload to Cloudinary and update the database.')
  await mongoose.disconnect()
  process.exit(0)
}

// 2. upload each image once
const map = new Map()
const failed = []
const queue = [...unique]
async function worker() {
  while (queue.length) {
    const url = queue.shift()
    try {
      map.set(url, await toCloudinary(url))
      console.log(`uploaded ${map.size}/${unique.size}`)
    } catch (err) {
      failed.push({ url, error: err.message || String(err) })
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

// 3. point the records at the new links (only the fields that contain a link are written)
let updated = 0
for (const { name, doc } of found) {
  const $set = {}
  for (const [key, value] of Object.entries(doc)) {
    if (key === '_id') continue
    const urls = new Set()
    collect(value, urls)
    if (urls.size && [...urls].every((u) => map.has(u))) $set[key] = replace(value, map)
  }
  if (Object.keys($set).length) {
    await db.collection(name).updateOne({ _id: doc._id }, { $set })
    updated += 1
  }
}
console.log(`Done. ${map.size} images are on Cloudinary, ${updated} records updated.`)
if (failed.length) {
  console.log(`${failed.length} images could not be moved and still point to Unsplash:`)
  console.table(failed)
}
await mongoose.disconnect()
