import { useState } from 'react'
import { useAsync } from '../components/useAsync.js'
import { Card, Empty, ErrorBox, Field, Input, PageTitle, Pager, Pill, Select, Spinner, Stat } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'
import { MODE_LABEL, addDays, dateOnly, formatPaise, todayStr } from '@/shared/utils/booking.js'

export default function Earnings() {
  const [villa, setVilla] = useState('')
  const [from, setFrom] = useState(addDays(todayStr(), -89))
  const [to, setTo] = useState(todayStr())
  const [page, setPage] = useState(1)
  const villas = useAsync(() => ownerAPI.villas(), [])
  const { data: d, error, loading, reload } = useAsync(() => ownerAPI.earnings({ villa: villa || undefined, from, to, page }), [villa, from, to, page])

  return (
    <>
      <PageTitle title="Earnings & payouts" subtitle="What you earn from each booking after platform fees"
        actions={(
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Villa"><Select value={villa} onChange={(e) => { setVilla(e.target.value); setPage(1) }}><option value="">All villas</option>{(villas.data || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select></Field>
            <Field label="Booked from"><Input type="date" value={from} max={to} onChange={(e) => { e.target.value && setFrom(e.target.value); setPage(1) }} /></Field>
            <Field label="to"><Input type="date" value={to} min={from} onChange={(e) => { e.target.value && setTo(e.target.value); setPage(1) }} /></Field>
          </div>
        )} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !d && <Spinner />}
      {d && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Earned" value={formatPaise(d.summary.earnedPaise)} sub="Stays completed" />
            <Stat label="Upcoming" value={formatPaise(d.summary.upcomingPaise)} sub="Confirmed, not finished" />
            <Stat label="Guests paid" value={formatPaise(d.summary.grossPaise)} />
            <Stat label="Fees & GST on fees" value={formatPaise(d.summary.commissionPaise)} />
          </div>
          <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">Money becomes yours once the guest has checked out. OviStays pays it to your bank account in regular payouts; the admin team records each payout.</p>
          {d.items.length === 0 ? <Empty title="No earnings in this period" /> : (
            <Card>
              <div className="-m-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Stay</th><th className="px-4 py-3 text-right">Guest paid</th><th className="px-4 py-3 text-right">Fees</th><th className="px-4 py-3 text-right">Your payout</th><th className="px-4 py-3">Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {d.items.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3"><p className="font-medium">{r.code}</p><p className="text-xs text-slate-500">{r.guest} · {r.villa}</p></td>
                        <td className="px-4 py-3 text-slate-600">{dateOnly(r.checkIn)}<p className="text-xs text-slate-500">{MODE_LABEL[r.mode]}</p></td>
                        <td className="px-4 py-3 text-right">{formatPaise(r.grossPaise)}</td>
                        <td className="px-4 py-3 text-right text-slate-500">−{formatPaise(r.feesPaise)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatPaise(r.payoutPaise)}</td>
                        <td className="px-4 py-3"><Pill>{r.payout}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          <Pager page={d.page} pages={d.pages} onChange={setPage} />
        </div>
      )}
    </>
  )
}
