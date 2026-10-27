import { useState } from 'react'
import { useAsync } from '../components/useAsync.js'
import BookingModal from '../components/BookingModal.jsx'
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
  const [open, setOpen] = useState(null)
  const refresh = () => { arrivals.reload(); inhouse.reload() }

  return (
    <>
      <PageTitle title="Check-in / Check-out" subtitle="Ask each guest for their check-in code when they arrive" actions={<Btn variant="outline" onClick={refresh}>Refresh</Btn>} />
      <div className="space-y-5">
        <Section title="Arriving today and tomorrow" hint="The code works from a few hours before the start time." state={arrivals} empty="No guests are arriving soon." action={(b) => <Btn size="sm" onClick={() => setOpen(b.id)}>Check in</Btn>} />
        <Section title="In house now" hint="Check guests out when they leave. Anyone left in house is checked out automatically a little after their end time." state={inhouse} empty="Nobody is checked in right now." action={(b) => <Btn size="sm" variant="outline" onClick={() => setOpen(b.id)}>{`Check out (${dateTime(b.checkOut).split(',').pop().trim()})`}</Btn>} />
        {!arrivals.loading && !inhouse.loading && arrivals.data?.items.length === 0 && inhouse.data?.items.length === 0 && <Empty title="All quiet" text="Arrivals and guests in house will appear here." />}
      </div>
      {open && <BookingModal id={open} onClose={() => setOpen(null)} onChanged={refresh} />}
    </>
  )
}
