import { useEffect } from 'react'
import { useUnread } from '@/core/notifications/unread.store.js'

// Unread notification count for the bell. Reads the shared copy; the server is asked only when it is old.
export function useUnreadCount() {
  const count = useUnread((s) => s.count)
  useEffect(() => { useUnread.getState().load() }, [])
  return count
}
