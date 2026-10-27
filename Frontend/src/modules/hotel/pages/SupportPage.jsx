import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Clock, Mail, MessageCircle, MessageSquare, Phone, Plus, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/services/api/axios.js'
import { useAsync } from '../components/useAsync.js'
import { Btn, Card, Empty, ErrorBox, Field, Input, Modal, Pill, Spinner, Textarea } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'
import { dateOnly } from '@/shared/utils/booking.js'

// Contact numbers come from Admin > Business Setup, so changing them there changes these buttons
function ContactButtons({ info, name }) {
  const hello = encodeURIComponent(`Hi ${info.companyName || 'OviStays'} support, I am ${name || 'a host'} and I need help.`)
  const btn = 'flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50'
  if (!info.dial) return <p className="text-sm text-slate-500">Support numbers have not been added yet. Please raise a ticket below.</p>
  return (
    <div className="flex gap-3">
      <a href={`tel:+${info.dial}`} className={btn}><span className="rounded-full bg-emerald-50 p-2 text-emerald-600"><Phone className="h-5 w-5" /></span>Call</a>
      <a href={`https://wa.me/${info.dial}?text=${hello}`} target="_blank" rel="noreferrer" className={btn}><span className="rounded-full bg-green-50 p-2 text-green-600"><MessageCircle className="h-5 w-5" /></span>Chat</a>
      <a href={`sms:+${info.dial}?body=${hello}`} className={btn}><span className="rounded-full bg-sky-50 p-2 text-sky-600"><MessageSquare className="h-5 w-5" /></span>Message</a>
    </div>
  )
}

function TicketForm({ onClose, onDone }) {
  const [f, setF] = useState({ subject: '', description: '' })
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await ownerAPI.createTicket(f)
      toast.success('Ticket sent. We will get back to you soon.')
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
      setBusy(false)
    }
  }
  return (
    <Modal open title="Raise a support ticket" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Subject"><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} required minLength={3} maxLength={100} placeholder="Payout delayed, villa approval, booking problem…" /></Field>
        <Field label="Describe the problem" hint={`${f.description.length}/1000`}><Textarea rows={5} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} required minLength={10} maxLength={1000} /></Field>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn type="submit" loading={busy}>Send ticket</Btn></div>
      </form>
    </Modal>
  )
}

export default function SupportPage() {
  const info = useAsync(() => ownerAPI.support(), [])
  const tickets = useAsync(() => ownerAPI.tickets(), [])
  const [raising, setRaising] = useState(false)
  const [name] = useState(() => { try { return JSON.parse(localStorage.getItem('ovistays-auth-hotel'))?.state?.user?.name } catch { return '' } })
  const data = info.data

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/hotel/profile" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700"><ChevronLeft className="h-4 w-4" /> Profile</Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Help & Support</h1>
        <Btn size="sm" onClick={() => setRaising(true)}><Plus className="h-4 w-4" /> Raise ticket</Btn>
      </div>
      {info.error && <ErrorBox message={info.error} onRetry={info.reload} />}
      {info.loading && !data && <Spinner />}

      {data && (
        <Card title="Talk to us">
          <ContactButtons info={data} name={name} />
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {data.phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{data.phone}</li>}
            {data.email && <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /><a href={`mailto:${data.email}`} className="text-sky-700">{data.email}</a></li>}
            {data.hours && <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" />{data.hours}</li>}
          </ul>
        </Card>
      )}

      <Card title="My support tickets" action={<Ticket className="h-4 w-4 text-slate-400" />}>
        {tickets.error && <ErrorBox message={tickets.error} onRetry={tickets.reload} />}
        {tickets.loading && !tickets.data && <Spinner />}
        {tickets.data?.length === 0 && <Empty title="No tickets yet" text="If calling or chatting is not enough, raise a ticket and we will reply." action={<Btn size="sm" onClick={() => setRaising(true)}>Raise a ticket</Btn>} />}
        <ul className="divide-y divide-slate-100">
          {(tickets.data || []).map((t) => (
            <li key={t.id} className="py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{t.subject}</p>
                <Pill>{t.status}</Pill>
              </div>
              <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{t.description}</p>
              <p className="mt-1 text-xs text-slate-400">{t.code} · {dateOnly(t.createdAt)}</p>
            </li>
          ))}
        </ul>
      </Card>

      {data && (
        <Card title="Common questions">
          <div className="divide-y divide-slate-100">
            {data.faqs.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">{f.q}</summary>
                <p className="mt-2 text-sm text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </Card>
      )}

      {raising && <TicketForm onClose={() => setRaising(false)} onDone={() => { setRaising(false); tickets.reload() }} />}
    </div>
  )
}
