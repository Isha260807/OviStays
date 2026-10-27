import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Lock, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/services/api/axios.js'
import { useAsync } from '../components/useAsync.js'
import { Btn, Card, Empty, ErrorBox, Field, Input, Modal, PageTitle, Pill, Select, Spinner, Tabs } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'
import {
  addDays, addMonths, dayLabel, formatPaise, fullDate, localDateOf, localTimeOf, monthCells, monthLabel, monthStart, timeOnly, todayStr, toPaise, weekdayOf,
} from '@/shared/utils/booking.js'

const VIEWS = [{ key: 'month', label: 'Month' }, { key: 'week', label: 'Week' }, { key: 'day', label: 'Day' }]
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_PX = 28

const blockTone = (b) => (b.type === 'owner_block' ? 'bg-slate-200 text-slate-700' : b.type === 'hold' ? 'bg-amber-100 text-amber-800' : b.booking?.status === 'Checked In' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800')
const blockLabel = (b) => (b.type === 'owner_block' ? b.reason || 'Blocked' : b.type === 'hold' ? `Hold · ${b.booking?.guest || 'guest'}` : b.booking?.guest || 'Booked')

// The local calendar days a block touches (a night stay covers several)
function daysOf(b) {
  const first = localDateOf(b.startAt)
  const last = localDateOf(new Date(new Date(b.endAt).getTime() - 1).toISOString())
  const out = []
  for (let d = first; d <= last; d = addDays(d, 1)) out.push(d)
  return out
}

function minutesOn(iso, day, edge) {
  const d = localDateOf(iso)
  if (d < day) return 0
  if (d > day) return 1440
  const [h, m] = localTimeOf(iso).split(':').map(Number)
  return edge === 'end' && h === 0 && m === 0 ? 1440 : h * 60 + m
}

function DayColumn({ day, blocks, onPick }) {
  const here = blocks.filter((b) => daysOf(b).includes(day))
  return (
    <div className="relative border-l border-slate-200" style={{ height: 24 * HOUR_PX }}>
      {Array.from({ length: 24 }, (_, h) => <div key={h} className="border-t border-slate-100" style={{ height: HOUR_PX }} />)}
      {here.map((b) => {
        const s = minutesOn(b.startAt, day, 'start')
        const e = Math.max(minutesOn(b.endAt, day, 'end'), s + 20)
        return (
          <button key={b.id} type="button" onClick={() => onPick(day)} title={`${blockLabel(b)} ${timeOnly(b.startAt)}–${timeOnly(b.endAt)}`}
            className={`absolute inset-x-0.5 overflow-hidden rounded px-1 text-left text-[11px] leading-tight cursor-pointer ${blockTone(b)}`} style={{ top: (s / 60) * HOUR_PX, height: ((e - s) / 60) * HOUR_PX }}>
            {blockLabel(b)}
          </button>
        )
      })}
    </div>
  )
}

function BlockModal({ villaId, defaultDate, open, onClose, onDone }) {
  const [kind, setKind] = useState('nights')
  const [f, setF] = useState({ from: defaultDate, to: defaultDate, date: defaultDate, startTime: '10:00', endTime: '18:00', reason: '' })
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await ownerAPI.block(villaId, kind === 'nights' ? { kind, from: f.from, to: f.to, reason: f.reason } : { kind, date: f.date, startTime: f.startTime, endTime: f.endTime, reason: f.reason })
      toast.success('Blocked')
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  return (
    <Modal open={open} title="Block dates or time" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Tabs tabs={[{ key: 'nights', label: 'Whole nights' }, { key: 'time', label: 'Part of a day' }]} value={kind} onChange={setKind} />
        {kind === 'nights' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="First night"><Input type="date" value={f.from} min={todayStr()} onChange={(e) => setF((x) => ({ ...x, from: e.target.value, to: x.to < e.target.value ? e.target.value : x.to }))} required /></Field>
            <Field label="Last night"><Input type="date" value={f.to} min={f.from} onChange={set('to')} required /></Field>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Date"><Input type="date" value={f.date} min={todayStr()} onChange={set('date')} required /></Field>
            <Field label="From"><Input type="time" value={f.startTime} onChange={set('startTime')} required /></Field>
            <Field label="To"><Input type="time" value={f.endTime} onChange={set('endTime')} required /></Field>
          </div>
        )}
        <Field label="Reason (only you see this)"><Input value={f.reason} onChange={set('reason')} maxLength={200} placeholder="Maintenance, family visit…" /></Field>
        <p className="text-xs text-slate-500">Guests cannot book blocked time. If a booking or hold already covers it, cancel that first.</p>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn type="submit" loading={busy}>Block</Btn></div>
      </form>
    </Modal>
  )
}

function PriceRules({ villaId }) {
  const rules = useAsync(() => ownerAPI.priceRules(villaId), [villaId])
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ label: '', startDate: todayStr(), endDate: todayStr(), price: '', adjust: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const add = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await ownerAPI.addRule(villaId, { label: f.label, startDate: f.startDate, endDate: f.endDate, nightPricePaise: f.price === '' ? null : toPaise(f.price), adjustPct: f.adjust === '' ? null : Number(f.adjust) })
      toast.success('Price period added')
      setOpen(false)
      rules.reload()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  const remove = async (id) => {
    if (!window.confirm('Remove this price period?')) return
    try { await ownerAPI.deleteRule(villaId, id); rules.reload() } catch (err) { toast.error(errorMessage(err)) }
  }

  return (
    <Card title="Seasonal & date-specific prices" action={<Btn size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Add period</Btn>}>
      {rules.error && <ErrorBox message={rules.error} onRetry={rules.reload} />}
      {rules.data?.length === 0 && <p className="text-sm text-slate-500">No special prices. Your normal nightly price applies every day.</p>}
      <ul className="divide-y divide-slate-100">
        {(rules.data || []).map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div><p className="font-medium">{r.label || 'Price period'}</p><p className="text-xs text-slate-500">{fullDate(r.startDate)} – {fullDate(r.endDate)}</p></div>
            <div className="flex items-center gap-3"><span className="font-semibold">{r.nightPricePaise != null ? `${formatPaise(r.nightPricePaise)} / night` : `${r.adjustPct > 0 ? '+' : ''}${r.adjustPct}%`}</span><button type="button" aria-label="Remove" onClick={() => remove(r.id)} className="text-red-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button></div>
          </li>
        ))}
      </ul>
      <Modal open={open} title="Add a price period" onClose={() => setOpen(false)}>
        <form onSubmit={add} className="space-y-4">
          <Field label="Name"><Input value={f.label} onChange={set('label')} maxLength={60} placeholder="New Year, Diwali, Monsoon offer…" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From"><Input type="date" value={f.startDate} onChange={set('startDate')} required /></Field>
            <Field label="To (included)"><Input type="date" value={f.endDate} min={f.startDate} onChange={set('endDate')} required /></Field>
            <Field label="Price per night (₹)" hint="Replaces your normal price"><Input type="number" min="0" value={f.price} onChange={set('price')} /></Field>
            <Field label="or change all prices by (%)" hint="e.g. 20 or -10"><Input type="number" min="-90" max="500" value={f.adjust} onChange={set('adjust')} /></Field>
          </div>
          <div className="flex justify-end gap-2"><Btn variant="outline" onClick={() => setOpen(false)}>Cancel</Btn><Btn type="submit" loading={busy} disabled={f.price === '' && f.adjust === ''}>Save</Btn></div>
        </form>
      </Modal>
    </Card>
  )
}

export default function CalendarPage() {
  const [params, setParams] = useSearchParams()
  const villas = useAsync(() => ownerAPI.villas(), [])
  const villaId = params.get('villa') || villas.data?.[0]?.id || ''
  const [view, setView] = useState('month')
  const [anchor, setAnchor] = useState(todayStr())
  const [selected, setSelected] = useState(todayStr())
  const [blocking, setBlocking] = useState(false)

  const monthFirst = monthStart(anchor)
  const from = addDays(monthFirst, -7)
  const to = addDays(from, 56)
  const cal = useAsync(() => (villaId ? ownerAPI.calendar(villaId, { from, to }) : null), [villaId, from])

  const nightBy = useMemo(() => Object.fromEntries((cal.data?.nights || []).map((n) => [n.date, n])), [cal.data])
  const blocks = cal.data?.blocks || []
  const cells = useMemo(() => monthCells(anchor), [anchor])
  const weekStart = addDays(anchor, -weekdayOf(anchor))

  const step = (dir) => setAnchor((a) => (view === 'month' ? addMonths(a, dir) : addDays(a, dir * (view === 'week' ? 7 : 1))))
  const selBlocks = blocks.filter((b) => daysOf(b).includes(selected))
  const villa = villas.data?.find((v) => v.id === villaId)

  const unblock = async (id) => {
    try { await ownerAPI.unblock(villaId, id); toast.success('Unblocked'); cal.reload() } catch (err) { toast.error(errorMessage(err)) }
  }

  if (villas.loading && !villas.data) return <Spinner />
  if (villas.data?.length === 0) return <Empty title="Add a villa first" text="Each villa has its own calendar." action={<Link to="/hotel/villas/new" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white">Add villa</Link>} />

  return (
    <>
      <PageTitle title="Calendar & pricing" subtitle="One calendar per villa. Night stays, day use and hourly slots all share it."
        actions={(
          <>
            <Select value={villaId} onChange={(e) => setParams({ villa: e.target.value })} aria-label="Villa" className="min-w-48">{(villas.data || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>
            <Btn onClick={() => setBlocking(true)}><Lock className="w-4 h-4" /> Block time</Btn>
          </>
        )} />
      {cal.error && <ErrorBox message={cal.error} onRetry={cal.reload} />}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Btn variant="outline" size="sm" aria-label="Previous" onClick={() => step(-1)}><ChevronLeft className="w-4 h-4" /></Btn>
          <Btn variant="outline" size="sm" onClick={() => { setAnchor(todayStr()); setSelected(todayStr()) }}>Today</Btn>
          <Btn variant="outline" size="sm" aria-label="Next" onClick={() => step(1)}><ChevronRight className="w-4 h-4" /></Btn>
          <h2 className="ml-2 font-semibold">{view === 'month' ? monthLabel(anchor) : view === 'week' ? `${dayLabel(weekStart)} – ${dayLabel(addDays(weekStart, 6))}` : dayLabel(anchor)}</h2>
        </div>
        <Tabs tabs={VIEWS} value={view} onChange={(v) => { setView(v); if (v !== 'month') setAnchor(selected) }} />
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600">
        {[['bg-white border border-slate-300', 'Available'], ['bg-amber-100', 'On hold (payment/approval pending)'], ['bg-sky-100', 'Booked'], ['bg-slate-200', 'Blocked by you']].map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><i className={`inline-block h-3 w-3 rounded ${c}`} />{l}</span>)}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          {view === 'month' && (
            <div className="min-w-[640px]">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-500">{DOW.map((d) => <div key={d} className="py-2">{d}</div>)}</div>
              <div className="grid grid-cols-7">
                {cells.map((d, i) => {
                  if (!d) return <div key={i} className="min-h-24 border-b border-r border-slate-100 bg-slate-50/50" />
                  const here = blocks.filter((b) => daysOf(b).includes(d))
                  const n = nightBy[d]
                  return (
                    <button key={d} type="button" onClick={() => setSelected(d)} aria-label={d}
                      className={`min-h-24 border-b border-r border-slate-100 p-1.5 text-left align-top cursor-pointer hover:bg-sky-50/50 ${selected === d ? 'bg-sky-50 ring-2 ring-inset ring-sky-400' : ''}`}>
                      <span className={`text-xs font-semibold ${d === todayStr() ? 'rounded-full bg-sky-600 px-1.5 py-0.5 text-white' : d < todayStr() ? 'text-slate-300' : 'text-slate-700'}`}>{Number(d.slice(8))}</span>
                      {n && d >= todayStr() && <span className="mt-0.5 block text-[10px] text-slate-400">{formatPaise(n.pricePaise)}</span>}
                      <div className="mt-1 space-y-0.5">
                        {here.slice(0, 2).map((b) => <span key={b.id} className={`block truncate rounded px-1 text-[10px] ${blockTone(b)}`}>{blockLabel(b)}</span>)}
                        {here.length > 2 && <span className="block text-[10px] text-slate-500">+{here.length - 2} more</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {view !== 'month' && (
            <div className="min-w-[640px]">
              <div className="grid border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-500" style={{ gridTemplateColumns: `48px repeat(${view === 'week' ? 7 : 1}, 1fr)` }}>
                <span />{Array.from({ length: view === 'week' ? 7 : 1 }, (_, i) => { const d = view === 'week' ? addDays(weekStart, i) : anchor; return <button key={d} type="button" onClick={() => setSelected(d)} className={`py-2 cursor-pointer ${selected === d ? 'text-sky-700' : ''}`}>{dayLabel(d)}</button> })}
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                <div className="grid" style={{ gridTemplateColumns: `48px repeat(${view === 'week' ? 7 : 1}, 1fr)` }}>
                  <div>{Array.from({ length: 24 }, (_, h) => <div key={h} className="pr-1 text-right text-[10px] text-slate-400" style={{ height: HOUR_PX }}>{String(h).padStart(2, '0')}:00</div>)}</div>
                  {Array.from({ length: view === 'week' ? 7 : 1 }, (_, i) => { const d = view === 'week' ? addDays(weekStart, i) : anchor; return <DayColumn key={d} day={d} blocks={blocks} onPick={setSelected} /> })}
                </div>
              </div>
            </div>
          )}
          {cal.loading && <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Updating…</div>}
        </div>

        <aside className="space-y-4">
          <Card title={dayLabel(selected)} action={nightBy[selected] && <span className="text-sm font-semibold">{formatPaise(nightBy[selected].pricePaise)}</span>}>
            {selBlocks.length === 0 ? <p className="text-sm text-slate-500">{selected < todayStr() ? 'Nothing happened this day.' : 'Free all day. Guests can book it.'}</p> : (
              <ul className="space-y-3">
                {selBlocks.map((b) => (
                  <li key={b.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2"><span className="font-semibold">{blockLabel(b)}</span><Pill tone={b.type === 'owner_block' ? 'gray' : b.type === 'hold' ? 'amber' : 'blue'}>{b.type === 'owner_block' ? 'Blocked' : b.type === 'hold' ? 'On hold' : 'Booked'}</Pill></div>
                    <p className="mt-1 text-xs text-slate-500">{fullDate(localDateOf(b.startAt))} {timeOnly(b.startAt)} → {fullDate(localDateOf(b.endAt))} {timeOnly(b.endAt)}</p>
                    {b.booking && <p className="mt-1 text-xs text-slate-600">{b.booking.guests} guests · {formatPaise(b.booking.totalPaise)} · <Link className="font-semibold text-sky-700" to={`/hotel/bookings/${b.booking.id}`}>{b.booking.code}</Link></p>}
                    {b.type === 'owner_block' && <Btn size="sm" variant="ghost" className="mt-2 !text-red-600" onClick={() => unblock(b.id)}><Trash2 className="w-3.5 h-3.5" /> Unblock</Btn>}
                  </li>
                ))}
              </ul>
            )}
            {selected >= todayStr() && <Btn size="sm" variant="outline" className="mt-3 w-full" onClick={() => setBlocking(true)}><Lock className="w-3.5 h-3.5" /> Block from this day</Btn>}
          </Card>
          {villa && <p className="text-xs text-slate-500">Showing <b>{villa.name}</b>. Times are in India time.</p>}
        </aside>
      </div>

      <div className="mt-5">{villaId && <PriceRules key={villaId} villaId={villaId} />}</div>
      {blocking && <BlockModal key={selected} villaId={villaId} defaultDate={selected < todayStr() ? todayStr() : selected} open onClose={() => setBlocking(false)} onDone={() => { setBlocking(false); cal.reload() }} />}
    </>
  )
}
