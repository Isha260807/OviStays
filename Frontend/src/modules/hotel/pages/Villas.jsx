import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, ClipboardList, MapPin, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'
import { useAsync } from '../components/useAsync.js'
import { Btn, Empty, ErrorBox, PageTitle, Pill, Spinner } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'
import { formatPaise, MODE_LABEL } from '@/shared/utils/booking.js'

const enabledModes = (v) => Object.keys(MODE_LABEL).filter((m) => v.bookingModes[m]?.enabled)

function VillaCard({ v, onChanged }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const run = async (fn, ok) => {
    setBusy(true)
    try {
      const res = await fn()
      toast.success(ok || res?.message || 'Done')
      onChanged()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  // Server-side messages come back in the response body, which the API wrapper drops; use a fixed message
  const submit = () => run(() => ownerAPI.submitVilla(v.id), 'Sent for approval')
  const toggle = (active) => run(() => ownerAPI.setActive(v.id, active), active ? 'Villa is live again' : 'Villa is hidden from search')
  const remove = () => window.confirm('Delete this draft?') && run(() => ownerAPI.deleteVilla(v.id), 'Draft deleted')

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="relative h-40 bg-slate-100">
        {v.coverImage ? <img src={assetUrl(v.coverImage)} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No cover photo</div>}
        <div className="absolute left-3 top-3"><Pill>{v.listingStatus}</Pill></div>
        {v.pendingRequests > 0 && <Link to="/hotel/bookings?tab=pending" className="absolute right-3 top-3 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white">{v.pendingRequests} request{v.pendingRequests > 1 ? 's' : ''}</Link>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="font-semibold text-slate-900">{v.name}</h3>
          <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="w-3.5 h-3.5" /> {[v.locality, v.city, v.state].filter(Boolean).join(', ')}</p>
        </div>
        <p className="text-xs text-slate-500">{v.bedrooms} bed · {v.bathrooms} bath · up to {v.maxGuests} guests</p>
        <div className="flex flex-wrap gap-1.5">{enabledModes(v).map((m) => <span key={m} className="rounded bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">{MODE_LABEL[m]}</span>)}{enabledModes(v).length === 0 && <span className="text-xs text-slate-400">No booking type on</span>}</div>
        <p className="text-xs text-slate-500">{v.confirmationMode === 'request' ? 'Request to book' : 'Instant booking'}{v.pricing.basePricePaise ? ` · from ${formatPaise(v.pricing.basePricePaise)} / night` : ''}</p>
        {v.listingStatus === 'Rejected' && v.rejectionReason && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">Rejected: {v.rejectionReason}</p>}
        {v.listingStatus === 'Suspended' && v.rejectionReason && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">Suspended: {v.rejectionReason}</p>}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Btn size="sm" variant="outline" onClick={() => navigate(`/hotel/villas/${v.id}`)} disabled={v.listingStatus === 'Suspended'}><Pencil className="w-3.5 h-3.5" /> Edit</Btn>
          <Btn size="sm" variant="outline" onClick={() => navigate(`/hotel/calendar?villa=${v.id}`)}><CalendarDays className="w-3.5 h-3.5" /> Calendar</Btn>
          <Btn size="sm" variant="outline" onClick={() => navigate(`/hotel/bookings?villa=${v.id}`)}><ClipboardList className="w-3.5 h-3.5" /> Bookings</Btn>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Draft', 'Rejected'].includes(v.listingStatus) && <Btn size="sm" loading={busy} onClick={submit}>Submit for approval</Btn>}
          {v.listingStatus === 'Approved' && <Btn size="sm" variant="ghost" loading={busy} onClick={() => toggle(false)}>Switch off</Btn>}
          {v.listingStatus === 'Inactive' && <Btn size="sm" variant="soft" loading={busy} onClick={() => toggle(true)}>Switch on</Btn>}
          {v.listingStatus === 'Draft' && <Btn size="sm" variant="ghost" loading={busy} onClick={remove}>Delete draft</Btn>}
        </div>
      </div>
    </article>
  )
}

export default function Villas() {
  const { data, error, loading, reload } = useAsync(() => ownerAPI.villas(), [])
  return (
    <>
      <PageTitle title="My Villas" subtitle="Every villa has its own photos, prices, calendar and bookings"
        actions={<Link to="/hotel/villas/new" className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"><Plus className="w-4 h-4" /> Add villa</Link>} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && data.length === 0 && <Empty title="No villas yet" text="Add your first villa. It stays a private draft until an admin approves it." action={<Link to="/hotel/villas/new" className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white">Add your first villa</Link>} />}
      {data && data.length > 0 && <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{data.map((v) => <VillaCard key={v.id} v={v} onChanged={reload} />)}</div>}
    </>
  )
}
