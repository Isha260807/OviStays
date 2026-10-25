import mongoose from 'mongoose'
import BroadcastNotification from '../../../models/BroadcastNotification.model.js'
import InboxNotification from '../../../models/InboxNotification.model.js'
import Hotel from '../../../models/Hotel.model.js'
import User from '../../user/models/User.model.js'
import { badRequest, notFound } from '../../../utils/httpError.js'

const MAX_CUSTOM_RECIPIENTS = 1000
const INSERT_BATCH = 1000
const TARGET_LABELS = { ALL: 'Everyone', USER: 'Guests', HOTEL: 'Hotels', CUSTOM: 'Particular persons' }

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const userTarget = (u) => ({ ownerType: 'USER', ownerId: u._id, label: u.name || u.phone || 'Guest', subLabel: [u.phone, u.email].filter(Boolean).join(' • ') })
const hotelTarget = (h) => ({ ownerType: 'HOTEL', ownerId: h._id, label: h.name, subLabel: [h.owner, h.city].filter(Boolean).join(' • ') })

const activeUsers = () => User.find({ status: 'Active' }).select('name phone email').lean()
const activeHotels = () => Hotel.find({ status: 'Active' }).select('name owner city').lean()

// A link must stay inside the app ("/bookings") or be https, so a message cannot point at a script.
function cleanLink(value) {
  const link = String(value ?? '').trim()
  if (!link) return ''
  if (!/^(\/[^\s/]\S*|https:\/\/\S+)$/.test(link)) throw badRequest('Link must start with / (inside the app) or https://')
  return link
}

// People to send to. For CUSTOM the ids are looked up again, so labels and existence are never taken from the client.
async function resolveTargets(targetType, requested) {
  if (targetType === 'USER') return (await activeUsers()).map(userTarget)
  if (targetType === 'HOTEL') return (await activeHotels()).map(hotelTarget)
  if (targetType === 'ALL') {
    const [users, hotels] = await Promise.all([activeUsers(), activeHotels()])
    return [...users.map(userTarget), ...hotels.map(hotelTarget)]
  }

  // CUSTOM
  const picks = (Array.isArray(requested) ? requested : []).filter(
    (t) => ['USER', 'HOTEL'].includes(t?.ownerType) && mongoose.isValidObjectId(t?.ownerId)
  )
  if (!picks.length) throw badRequest('Please select at least one recipient')
  if (picks.length > MAX_CUSTOM_RECIPIENTS) throw badRequest(`Select at most ${MAX_CUSTOM_RECIPIENTS} recipients`)
  const ids = (type) => [...new Set(picks.filter((t) => t.ownerType === type).map((t) => String(t.ownerId)))]
  const [users, hotels] = await Promise.all([
    User.find({ _id: { $in: ids('USER') }, status: 'Active' }).select('name phone email').lean(),
    Hotel.find({ _id: { $in: ids('HOTEL') }, status: 'Active' }).select('name owner city').lean(),
  ])
  return [...users.map(userTarget), ...hotels.map(hotelTarget)]
}

export async function createBroadcast({ body, adminId }) {
  const title = String(body?.title ?? '').trim()
  const message = String(body?.message ?? '').trim()
  if (!title) throw badRequest('Title is required')
  if (!message) throw badRequest('Message is required')
  if (title.length > 100) throw badRequest('Title is too long (max 100 characters)')
  if (message.length > 500) throw badRequest('Message is too long (max 500 characters)')
  const targetType = String(body?.targetType ?? '').toUpperCase()
  if (!TARGET_LABELS[targetType]) throw badRequest('Target type is invalid')
  const link = cleanLink(body?.link)

  const targets = await resolveTargets(targetType, body?.targets)
  if (!targets.length) throw badRequest('There is nobody to send this to yet')

  const broadcast = await BroadcastNotification.create({
    title, message, targetType, link, createdBy: adminId,
    targets: targetType === 'CUSTOM' ? targets : [],
    targetCount: targets.length,
  })

  // One inbox entry per person, written in batches so a large audience stays cheap
  for (let i = 0; i < targets.length; i += INSERT_BATCH) {
    await InboxNotification.insertMany(
      targets.slice(i, i + INSERT_BATCH).map((t) => ({
        ownerType: t.ownerType, ownerId: t.ownerId, title, message, link, broadcast: broadcast._id,
      })),
      { ordered: false }
    )
  }
  return present(broadcast)
}

function present(b) {
  const o = b.toObject ? b.toObject() : b
  return { ...o, targetLabel: TARGET_LABELS[o.targetType] || o.targetType }
}

export async function listBroadcasts({ page, limit }) {
  const p = Math.max(1, parseInt(page, 10) || 1)
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 10))
  const [items, total] = await Promise.all([
    BroadcastNotification.find().sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    BroadcastNotification.countDocuments(),
  ])
  return { items: items.map(present), total, page: p, pages: Math.max(1, Math.ceil(total / l)) }
}

export async function deleteBroadcast(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound()
  const broadcast = await BroadcastNotification.findByIdAndDelete(id)
  if (!broadcast) throw notFound()
  // Recalling a broadcast also removes it from everyone's inbox
  const removed = await InboxNotification.deleteMany({ broadcast: broadcast._id })
  return { removedFromInboxes: removed.deletedCount }
}

// People the admin can pick for a CUSTOM broadcast
export async function searchRecipients(query) {
  const q = String(query ?? '').trim()
  const rx = q ? new RegExp(escapeRegex(q), 'i') : null
  const [users, hotels] = await Promise.all([
    User.find({ status: 'Active', ...(rx && { $or: [{ name: rx }, { email: rx }, { phone: rx }] }) }).select('name phone email').limit(30).lean(),
    Hotel.find({ status: 'Active', ...(rx && { $or: [{ name: rx }, { owner: rx }, { city: rx }, { email: rx }] }) }).select('name owner city').limit(30).lean(),
  ])
  return [...users.map(userTarget), ...hotels.map(hotelTarget)].map((t) => ({ ...t, ownerId: String(t.ownerId) }))
}
