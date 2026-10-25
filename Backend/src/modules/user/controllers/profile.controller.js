import mongoose from 'mongoose'
import User from '../models/User.model.js'
import Hotel from '../../../models/Hotel.model.js'
import { IMAGE_PATH_PATTERN } from '../../../utils/uploadPaths.js'
import { badRequest, HttpError } from '../../../utils/httpError.js'
import { villaCard } from './home.controller.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const profileView = (u) => ({
  _id: u._id,
  refId: u.refId,
  name: u.name,
  email: u.email,
  phone: u.phone,
  photo: u.photo || '',
  status: u.status,
  createdAt: u.createdAt,
})

async function currentUser(req) {
  const user = await User.findById(req.auth.id)
  if (!user || user.status !== 'Active') throw new HttpError(401, 'User session invalid or expired')
  return user
}

// ---- profile ---------------------------------------------------------------------------------

export async function getProfile(req, res) {
  res.json({ success: true, data: profileView(await currentUser(req)) })
}

// The phone number is the login, so only name, email and photo can be changed here
export async function updateProfile(req, res) {
  const user = await currentUser(req)
  const b = req.body || {}

  if (b.name !== undefined) {
    const name = String(b.name).trim()
    if (name.length < 2 || name.length > 50) throw badRequest('Name must be between 2 and 50 characters')
    user.name = name
  }
  if (b.email !== undefined) {
    const email = String(b.email).trim().toLowerCase()
    if (email && !EMAIL.test(email)) throw badRequest('Please enter a valid email address')
    user.email = email
  }
  if (b.photo !== undefined) {
    const photo = String(b.photo).trim()
    if (photo && !IMAGE_PATH_PATTERN.test(photo)) throw badRequest('Photo must be an uploaded image')
    user.photo = photo
  }

  await user.save()
  res.json({ success: true, message: 'Profile updated', data: profileView(user) })
}

// ---- favourites ------------------------------------------------------------------------------

// Newest favourite first. `ids` lists every saved villa so hearts can be filled without loading the cards.
export async function getWishlist(req, res) {
  const user = await currentUser(req)
  const ids = (user.wishlist || []).map(String).reverse()
  const docs = ids.length ? await Hotel.find({ _id: { $in: ids }, status: 'Active' }).lean() : []
  const byId = new Map(docs.map((d) => [String(d._id), d]))
  res.json({
    success: true,
    data: { ids, items: ids.map((i) => byId.get(i)).filter(Boolean).map(villaCard) },
  })
}

async function villaIdFrom(req) {
  const id = req.params.villaId
  if (!mongoose.isValidObjectId(id)) throw badRequest('Invalid villa')
  return id
}

export async function addToWishlist(req, res) {
  const id = await villaIdFrom(req)
  const exists = await Hotel.exists({ _id: id, status: 'Active' })
  if (!exists) throw new HttpError(404, 'Villa not found')
  await User.updateOne({ _id: req.auth.id }, { $addToSet: { wishlist: id } })
  res.json({ success: true })
}

export async function removeFromWishlist(req, res) {
  const id = await villaIdFrom(req)
  await User.updateOne({ _id: req.auth.id }, { $pull: { wishlist: id } })
  res.json({ success: true })
}
