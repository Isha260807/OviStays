import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../components/useAsync.js'
import { Card, Empty, ErrorBox, Field, Input, PageTitle, Select, Spinner, Stat } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'
import { addDays, dateTime, formatPaise, MODE_LABEL, todayStr } from '@/shared/utils/booking.js'

function PeopleList({ title, items, empty }) {
  return (
    <Card title={title}>
      {items.length === 0 ? <p className="text-sm text-slate-500">{empty}</p> : (
        <ul className="divide-y divide-slate-100">
          {items.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{b.guest}</p>
                <p className="truncate text-xs text-slate-500">{b.villa} · {MODE_LABEL[b.mode] || 'Stay'} · {b.guests} guests</p>
              </div>
              <div className="text-right text-xs text-slate-500"><p>{dateTime(b.at)}</p><Link to={`/hotel/bookings/${b.id}`} className="font-semibold text-sky-700">Open</Link></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function Dashboard() {
  const [villa, setVilla] = useState('')
  const [from, setFrom] = useState(addDays(todayStr(), -29))
  const [to, setTo] = useState(todayStr())

  const villas = useAsync(() => ownerAPI.villas(), [])
  const dash = useAsync(() => ownerAPI.dashboard({ villa: villa || undefined, from, to }), [villa, from, to])
  const d = dash.data

  return (
    <>
      <PageTitle title="Dashboard" subtitle="How your villas are doing"
        actions={(
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Villa">
              <Select value={villa} onChange={(e) => setVilla(e.target.value)} aria-label="Villa">
                <option value="">All villas</option>
                {(villas.data || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>
            <Field label="From"><Input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></Field>
            <Field label="To"><Input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></Field>
          </div>
        )} />

      {dash.error && <ErrorBox message={dash.error} onRetry={dash.reload} />}
      {!d && dash.loading && <Spinner />}
      {d && (
        <div className="space-y-5">
          {d.now.pendingRequests > 0 && (
            <Link to="/hotel/bookings?tab=pending" className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800">
              <span>{d.now.pendingRequests} booking request{d.now.pendingRequests > 1 ? 's' : ''} waiting for your reply</span><span className="underline">Review now</span>
            </Link>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Earnings" value={formatPaise(d.totals.earningsPaise)} sub="After platform fees" />
            <Stat label="Bookings" value={d.totals.bookings} sub={`${d.totals.confirmed} confirmed · ${d.totals.cancelled} cancelled`} />
            <Stat label="Pending requests" value={d.now.pendingRequests} tone={d.now.pendingRequests ? 'warn' : undefined} sub={`${d.now.awaitingPayment} awaiting payment`} />
            <Stat label="Arriving in 7 days" value={d.now.arrivingNext7Days} sub={`${d.now.inHouse} guests in house`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <PeopleList title="Arriving soon" items={d.arrivals} empty="No arrivals in the next two days." />
            <PeopleList title="Leaving soon" items={d.departures} empty="No departures due." />
          </div>

          <Card title="By villa">
            {d.perVilla.length === 0 ? <Empty title="No earnings yet" text="Bookings will show up here once guests start paying." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">Villa</th><th className="py-2 text-right">Bookings</th><th className="py-2 text-right">Earnings</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {d.perVilla.map((v) => <tr key={v.villaId}><td className="py-2.5 font-medium">{v.name}</td><td className="py-2.5 text-right">{v.bookings}</td><td className="py-2.5 text-right">{formatPaise(v.earningsPaise)}</td></tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <p className="text-xs text-slate-500">Rating across your villas: {d.rating.count ? `${d.rating.average} / 5 from ${d.rating.count} reviews` : 'no reviews yet'}.</p>
        </div>
      )}
    </>
  )
}
