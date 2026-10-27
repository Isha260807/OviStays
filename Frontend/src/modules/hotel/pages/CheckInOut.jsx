import { Link } from 'react-router-dom'
import { useAsync } from '../components/useAsync.js'
import { Btn, Card, Empty, ErrorBox, PageTitle, Pill, Spinner } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'
import { MODE_LABEL, dateTime, slotText } from '@/shared/utils/booking.js'

function Section({ title, hint, state, action, empty }) {
  return (
    <Card title={title}>
      {hint && <p className="mb-3 text-xs text-slate-500">{hint}</p>}
      {state.error && <ErrorBox message={state.error} onRetry={state.reload} />}
      {state.loading && !state.data && <Spinner />}
      {state.data && state.data.items.length === 0 && <p className="text-sm text-slate-500">{empty}</p>}
      <ul className="divide-y divide-slate-100">
        {(state.data?.items || []).map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{b.guest.name} <span className="font-normal text-slate-500">· {b.guests} guests</span></p>
              <p className="text-xs text-slate-500">{b.code} · {b.villaName} · {MODE_LABEL[b.mode]}</p>
              <p className="text-xs text-slate-600">{slotText(b)}</p>
              {b.guest.phone && <p className="text-xs text-slate-500">{b.guest.phone}</p>}
            </div>
            <div className="flex items-center gap-2"><Pill>{b.status}</Pill>{action(b)}</div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// A front-desk view: who is arriving, who is staying and who should leave.
export default function CheckInOut() {
  const arrivals = useAsync(() => ownerAPI.bookings({ tab: 'arrivals', limit: 50 }), [])
  const inhouse = useAsync(() => ownerAPI.bookings({ tab: 'inhouse', limit: 50 }), [])
  const refresh = () => { arrivals.reload(); inhouse.reload() }

  return (
    <>
      <PageTitle title="Check-in / Check-out" subtitle="Ask each guest for their check-in code when they arrive" actions={<Btn variant="outline" onClick={refresh}>Refresh</Btn>} />
      <div className="space-y-5">
        <Section title="Arriving today and tomorrow" hint="The code works from a few hours before the start time." state={arrivals} empty="No guests are arriving soon." action={(b) => <Link to={`/hotel/bookings/${b.id}`} className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">Check in</Link>} />
        <Section title="In house now" hint="Check guests out when they leave. Anyone left in house is checked out automatically a little after their end time." state={inhouse} empty="Nobody is checked in right now." action={(b) => <Link to={`/hotel/bookings/${b.id}`} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50">{`Check out (${dateTime(b.checkOut).split(',').pop().trim()})`}</Link>} />
        {!arrivals.loading && !inhouse.loading && arrivals.data?.items.length === 0 && inhouse.data?.items.length === 0 && <Empty title="All quiet" text="Arrivals and guests in house will appear here." />}
      </div>
    </>
  )
}
