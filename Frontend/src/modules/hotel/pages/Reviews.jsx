import { useState } from 'react'
import { Star } from 'lucide-react'
import { useAsync } from '../components/useAsync.js'
import { Empty, ErrorBox, PageTitle, Select, Spinner } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'
import { dateOnly } from '@/shared/utils/booking.js'

export default function Reviews() {
  const [villa, setVilla] = useState('')
  const villas = useAsync(() => ownerAPI.villas(), [])
  const { data, error, loading, reload } = useAsync(() => ownerAPI.reviews({ villa: villa || undefined }), [villa])

  return (
    <>
      <PageTitle title="Reviews" subtitle="What guests say about your villas"
        actions={<Select value={villa} onChange={(e) => setVilla(e.target.value)} aria-label="Villa" className="min-w-48"><option value="">All villas</option>{(villas.data || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && data.length === 0 && <Empty title="No reviews yet" text="Guests can review a stay after they check out. Reviews appear once approved." />}
      <ul className="space-y-3">
        {(data || []).map((r) => (
          <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{r.guest} <span className="font-normal text-slate-500">on {r.villa}</span></p>
              <span className="flex items-center gap-0.5" aria-label={`${r.rating} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className="h-4 w-4" fill={n <= r.rating ? '#F5A524' : 'none'} stroke={n <= r.rating ? '#F5A524' : '#CBD5E1'} />)}</span>
            </div>
            {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
            <p className="mt-2 text-xs text-slate-400">{dateOnly(r.date)}</p>
          </li>
        ))}
      </ul>
    </>
  )
}
