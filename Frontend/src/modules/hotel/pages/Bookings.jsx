import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAsync } from '../components/useAsync.js'
import { Empty, ErrorBox, Input, PageTitle, Pager, Pill, Select, Spinner, Tabs } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'
import { MODE_LABEL, formatPaise, slotText, timeLeft } from '@/shared/utils/booking.js'

const TABS = [
  { key: 'pending', label: 'Pending requests' },
  { key: 'awaiting', label: 'Awaiting payment' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'upcoming', label: 'Upcoming stays' },
  { key: 'inhouse', label: 'In house' },
  { key: 'past', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled & rejected' },
  { key: 'all', label: 'All' },
]

export default function Bookings() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'all'
  const villa = params.get('villa') || ''
  const [search, setSearch] = useState(params.get('search') || '')
  const [q, setQ] = useState(params.get('search') || '')
  const [page, setPage] = useState(1)

  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])

  const villas = useAsync(() => ownerAPI.villas(), [])
  const list = useAsync(() => ownerAPI.bookings({ tab: tab === 'all' ? undefined : tab, villa: villa || undefined, search: q || undefined, page }), [tab, villa, q, page])
  const d = list.data
  const set = (patch) => { const next = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k))); setParams(next, { replace: true }); setPage(1) }

  const tabs = TABS.map((t) => (t.key === 'pending' && d?.pendingRequests ? { ...t, badge: d.pendingRequests } : t))

  return (
    <>
      <PageTitle title="Bookings" subtitle="Requests, confirmed stays and everything in between" />
      <Tabs tabs={tabs} value={tab} onChange={(t) => set({ tab: t === 'all' ? '' : t })} />
      <div className="my-4 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search booking ID or guest" className="!pl-9" aria-label="Search bookings" />
        </div>
        <Select value={villa} onChange={(e) => set({ villa: e.target.value })} aria-label="Villa" className="!w-auto min-w-48">
          <option value="">All villas</option>
          {(villas.data || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
      </div>

      {list.error && <ErrorBox message={list.error} onRetry={list.reload} />}
      {list.loading && !d && <Spinner />}
      {d && d.items.length === 0 && <Empty title="Nothing here" text={tab === 'pending' ? 'No booking requests are waiting for you.' : 'No bookings match these filters.'} />}
      {d && d.items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {d.items.map((b) => (
              <li key={b.id}>
                <Link to={`/hotel/bookings/${b.id}`} className="grid w-full gap-2 px-4 py-3.5 text-left hover:bg-slate-50 sm:grid-cols-[1.2fr_1.6fr_auto_auto] sm:items-center">
                  <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{b.guest.name}</p><p className="truncate text-xs text-slate-500">{b.code} · {b.villaName}</p></div>
                  <div className="min-w-0 text-sm text-slate-700"><p className="truncate">{slotText(b)}</p><p className="text-xs text-slate-500">{MODE_LABEL[b.mode]} · {b.guests} guests</p></div>
                  <div className="flex flex-wrap items-center gap-1.5"><Pill>{b.status}</Pill>{b.canRespond && <span className="text-xs font-semibold text-amber-700">{timeLeft(b.ownerResponseDueAt)}</span>}</div>
                  <div className="text-right"><p className="font-semibold">{formatPaise(b.payoutPaise)}</p><p className="text-[11px] text-slate-500">your payout</p></div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {d && <Pager page={d.page} pages={d.pages} onChange={setPage} />}
    </>
  )
}
