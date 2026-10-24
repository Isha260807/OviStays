import { createBroadcast, listBroadcasts, deleteBroadcast, searchRecipients } from '../services/broadcast.service.js'

export async function create(req, res) {
  const data = await createBroadcast({ body: req.body, adminId: req.auth.id })
  res.status(201).json({ success: true, message: 'Broadcast notification sent', data })
}

export async function list(req, res) {
  res.json({ success: true, data: await listBroadcasts(req.query) })
}

export async function remove(req, res) {
  res.json({ success: true, message: 'Broadcast notification deleted', data: await deleteBroadcast(req.params.id) })
}

export async function recipients(req, res) {
  res.json({ success: true, data: await searchRecipients(typeof req.query.q === 'string' ? req.query.q : '') })
}
