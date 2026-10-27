import { useEffect, useState } from 'react'
import { Clock, LifeBuoy, Mail, Phone } from 'lucide-react'
import api from '@/services/api/axios.js'
import { C } from '../../components/home/homeUi.jsx'
import { PageShell } from '../../components/common/PageParts.jsx'
import { Field, Notice, card, cardBorder, errorText, inputCls, primaryBtn } from '../../components/account/AccountUi.jsx'
import { shortDate } from '../../utils/format.js'

const STATUS_STYLE = {
  Open: 'bg-amber-50 text-amber-700',
  'In Progress': 'bg-sky-50 text-sky-700',
  Resolved: 'bg-emerald-50 text-emerald-700',
  Closed: 'bg-gray-100 text-gray-600',
}

export default function Support() {
  const [info, setInfo] = useState(null)
  const [tickets, setTickets] = useState([])
  const [form, setForm] = useState({ subject: '', description: '' })
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const openTicketForm = () => setShowTicketForm(true)

  useEffect(() => {
    api.get('/user/support').then((res) => setInfo(res.data.data)).catch(() => {})
    api.get('/user/support/tickets').then((res) => setTickets(res.data.data)).catch(() => {})
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const res = await api.post('/user/support/tickets', form)
      setTickets((t) => [res.data.data, ...t])
      setForm({ subject: '', description: '' })
      setMessage({ ok: true, text: res.data.message })
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  const contacts = info && [
    info.email && { icon: Mail, label: 'Email us', value: info.email, href: `mailto:${info.email}` },
    info.phone && { icon: Phone, label: 'Call us', value: info.phone, href: `tel:${info.phone.replace(/\s/g, '')}` },
    info.hours && { icon: Clock, label: 'Support hours', value: info.hours },
  ].filter(Boolean)

  return (
    <PageShell narrow title="Help & Support" subtitle="We are happy to help with your stay">
      {contacts?.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-3">
          {contacts.map((c) => {
            const body = (
              <>
                <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.peach, color: C.primaryDark }}><c.icon className="w-5 h-5" /></span>
                <span className="min-w-0"><span className="block text-xs" style={{ color: C.muted }}>{c.label}</span><span className="block text-sm font-semibold truncate">{c.value}</span></span>
              </>
            )
            return c.href
              ? <a key={c.label} href={c.href} className={`${card} flex items-center gap-3 p-3.5`} style={cardBorder}>{body}</a>
              : <div key={c.label} className={`${card} flex items-center gap-3 p-3.5`} style={cardBorder}>{body}</div>
          })}
        </section>
      )}

      <button type='button' onClick={openTicketForm} className={primaryBtn + ' mt-8 w-full inline-flex items-center justify-center gap-2'} style={{ background: C.primary }}>
        <LifeBuoy className='w-4 h-4' /> Raise a support ticket
      </button>
      {showTicketForm && (
        <section className="mt-8">
          <h2 className='font-serif-display text-xl font-bold mb-3'>Support ticket</h2>
        <form onSubmit={submit} className={`${card} p-5 space-y-4`} style={cardBorder}>
          <Field label="Subject">
            <input className={inputCls} style={cardBorder} value={form.subject} onChange={set('subject')} maxLength={100} placeholder="What is this about?" required />
          </Field>
          <Field label="Describe the problem" hint={`${form.description.length}/1000`}>
            <textarea className={`${inputCls} min-h-[120px] resize-y`} style={cardBorder} value={form.description} onChange={set('description')} maxLength={1000} placeholder="Tell us what happened and we will get back to you" required />
          </Field>
          <Notice message={message} />
          <button type="submit" disabled={busy} className={primaryBtn} style={{ background: C.primary }}>{busy ? 'Sending...' : 'Send request'}</button>
        </form>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-serif-display text-xl font-bold mb-3">Support ticket history</h2>
          {tickets.length === 0 ? (
            <div className={card + ' p-4'} style={cardBorder}>
              <p className='text-sm' style={{ color: C.muted }}>No support tickets yet.</p>
            </div>
          ) : (
          <ul className='space-y-3'>
            {tickets.map((t) => (
              <li key={t.id} className={`${card} p-4`} style={cardBorder}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{t.subject}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[t.status] || STATUS_STYLE.Closed}`}>{t.status}</span>
                </div>
                <p className="text-xs mt-1" style={{ color: C.muted }}>{t.code} · {shortDate(t.createdAt)}</p>
              </li>
            ))}
          </ul>
          )}
      </section>

      {!info && <p className="mt-10 text-center text-sm" style={{ color: C.muted }}><LifeBuoy className="inline w-4 h-4 mr-1" />Loading help...</p>}
    </PageShell>
  )
}
