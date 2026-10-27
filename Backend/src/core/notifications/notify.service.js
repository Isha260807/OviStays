import InboxNotification from '../../models/InboxNotification.model.js'

// Puts a message in someone's inbox. A failed notification must never break the booking step that sent it.
function send(ownerType, ownerId, { title, message, link = '', category = 'booking' }) {
  if (!ownerId) return Promise.resolve()
  return InboxNotification.create({ ownerType, ownerId, title, message, link, category }).catch((err) => console.error('Notification failed:', err.message))
}

export const notifyUser = (userId, payload) => send('USER', userId, payload)
export const notifyOwner = (ownerId, payload) => send('OWNER', ownerId, payload)
