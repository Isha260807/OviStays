import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAsync } from '../components/useAsync.js'
import { Btn, Empty, ErrorBox, PageTitle, Pager, Spinner } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'
import { dateTime } from '@/shared/utils/booking.js'

export default function Notifications() {
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const { data, error, loading, reload } = useAsync(() => ownerAPI.notifications({ page }), [page])

  const open = async (n) => {
    if (!n.read) await ownerAPI.readOne(n.id).catch(() => {})
    reload()
    if (n.link?.startsWith('/hotel')) navigate(n.link)
  }
  const readAll = async () => { await ownerAPI.readAll(); reload() }

  return (
    <>
      <PageTitle title="Notifications" actions={data?.unread > 0 && <Btn variant="outline" onClick={readAll}>Mark all as read</Btn>} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && data.items.length === 0 && <Empty title="You're all caught up" text="Booking requests, payments and admin messages will show up here." />}
      <ul className="space-y-2">
        {(data?.items || []).map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => open(n)} className={`w-full rounded-xl border p-4 text-left cursor-pointer hover:bg-slate-50 ${n.read ? 'border-slate-200 bg-white' : 'border-sky-200 bg-sky-50'}`}>
              <div className="flex items-start justify-between gap-3"><p className="font-semibold text-slate-900">{n.title}</p><span className="shrink-0 text-xs text-slate-500">{dateTime(n.createdAt)}</span></div>
              <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
            </button>
          </li>
        ))}
      </ul>
      {data && <Pager page={data.page} pages={data.pages} onChange={setPage} />}
    </>
  )
}
