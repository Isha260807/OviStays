import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import api from '@/services/api/axios.js'
import { useUnread } from '@/core/notifications/unread.store.js'
import { C } from '../../components/home/homeUi.jsx'
import { EmptyState, ErrorNote, PageShell, Skeletons } from '../../components/common/PageParts.jsx'
import { timeAgo } from '../../utils/format.js'

export default function Notifications() {
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [unread, setUnread] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [error, setError] = useState(false)

  const load = async (n = 1) => {
    try {
      const res = await api.get('/user/notifications', { params: { page: n } })
      const d = res.data.data
      setItems((prev) => (n === 1 ? d.items : [...(prev || []), ...d.items]))
      setUnread(d.unread)
      useUnread.getState().setCount(d.unread)
      setPage(n)
      setPages(d.pages)
    } catch {
      setError(true)
    }
  }

  useEffect(() => { load(1) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const open = async (n) => {
    if (!n.read) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      setUnread((u) => Math.max(u - 1, 0))
      useUnread.getState().setCount(Math.max(unread - 1, 0))
      api.post(`/user/notifications/${n.id}/read`).catch(() => {})
    }
    if (n.link?.startsWith('/')) navigate(n.link)
  }

  const readAll = async () => {
    setItems((list) => list.map((x) => ({ ...x, read: true })))
    setUnread(0)
    useUnread.getState().setCount(0)
    api.post('/user/notifications/read-all').catch(() => {})
  }

  return (
    <PageShell
      narrow
      title="Notifications"
      subtitle={items && unread > 0 ? `${unread} unread` : undefined}
      action={unread > 0 && (
        <button type="button" onClick={readAll} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-sm font-semibold cursor-pointer" style={{ borderColor: '#E2EDF5', color: C.primaryDark }}>
          <CheckCheck className="w-4 h-4" /> Mark all read
        </button>
      )}
    >
      {error && !items ? <ErrorNote /> : items === null ? (
        <Skeletons count={4} className="h-[84px]" grid="grid gap-3" />
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="You are all caught up" text="Booking updates and offers will appear here." />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => open(n)} className="w-full text-left flex gap-3.5 rounded-2xl border bg-white p-4 cursor-pointer hover:shadow-[0_8px_24px_rgba(22,138,211,0.1)] transition-shadow" style={{ borderColor: n.read ? '#E2EDF5' : C.primary }}>
                  <span className="mt-0.5 w-10 h-10 shrink-0 rounded-full flex items-center justify-center" style={{ background: C.peach, color: C.primaryDark }}><Bell className="w-5 h-5" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-start justify-between gap-3">
                      <span className={`text-[15px] ${n.read ? 'font-medium' : 'font-bold'}`}>{n.title}</span>
                      {!n.read && <span className="mt-1.5 w-2.5 h-2.5 shrink-0 rounded-full" style={{ background: C.primaryDark }} />}
                    </span>
                    <span className="block text-sm mt-0.5 leading-snug" style={{ color: C.muted }}>{n.message}</span>
                    <span className="block text-[11px] mt-1.5" style={{ color: C.muted }}>{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {page < pages && (
            <div className="mt-6 text-center">
              <button type="button" onClick={() => load(page + 1)} className="rounded-full border bg-white px-8 py-2.5 text-sm font-semibold cursor-pointer" style={{ borderColor: '#E2EDF5' }}>Load older</button>
            </div>
          )}
        </>
      )}
    </PageShell>
  )
}
