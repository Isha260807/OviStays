import { useEffect, useState } from 'react'
import { Mail, Pencil, Phone, Plus, Trash2, Users } from 'lucide-react'
import api from '@/services/api/axios.js'
import { C } from '../../components/home/homeUi.jsx'
import { AccountShell, Field, Notice, card, cardBorder, errorText, inputCls, primaryBtn } from '../../components/account/AccountUi.jsx'

const BLANK = { name: '', phone: '', email: '' }

// People the guest books for often. The booking form will be able to fill from this list.
export default function SavedGuests() {
  const [guests, setGuests] = useState(null)
  const [editing, setEditing] = useState(null) // null | 'new' | guest id
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let alive = true
    api.get('/user/guests')
      .then((res) => alive && setGuests(res.data.data))
      .catch(() => alive && setGuests([]))
    return () => { alive = false }
  }, [])

  const open = (guest) => {
    setMessage(null)
    setEditing(guest ? guest.id : 'new')
    setForm(guest ? { name: guest.name, phone: guest.phone, email: guest.email } : BLANK)
  }
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = editing === 'new' ? await api.post('/user/guests', form) : await api.put(`/user/guests/${editing}`, form)
      setGuests(res.data.data)
      setEditing(null)
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (guest) => {
    if (!window.confirm(`Remove ${guest.name} from your saved guests?`)) return
    try {
      const res = await api.delete(`/user/guests/${guest.id}`)
      setGuests(res.data.data)
      if (editing === guest.id) setEditing(null)
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
    }
  }

  return (
    <AccountShell title="Saved Guest Details">
      <p className="text-sm mb-4" style={{ color: C.muted }}>Save the people you travel with, so you do not have to type their details for every booking.</p>

      {guests === null ? (
        <div className="space-y-3 animate-pulse">{[0, 1].map((i) => <div key={i} className="h-[76px] rounded-2xl bg-[#DDF3FF]" />)}</div>
      ) : (
        <div className="space-y-3">
          {guests.length === 0 && editing !== 'new' && (
            <div className="flex flex-col items-center text-center py-10">
              <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.peach, color: C.primaryDark }}><Users className="w-6 h-6" /></span>
              <p className="font-serif-display text-lg font-bold mt-3">No saved guests yet</p>
              <p className="text-sm mt-1" style={{ color: C.muted }}>Add the people you usually travel with.</p>
            </div>
          )}

          {guests.map((g) => (
            editing === g.id ? null : (
              <div key={g.id} className={`${card} p-4 flex items-start gap-3`} style={cardBorder}>
                <span className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: C.peach, color: C.primaryDark }}>{g.name.charAt(0).toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold truncate">{g.name}</p>
                  <p className="flex items-center gap-1.5 text-xs mt-1" style={{ color: C.muted }}><Phone className="w-3.5 h-3.5" /> {g.phone}</p>
                  {g.email && <p className="flex items-center gap-1.5 text-xs mt-0.5 truncate" style={{ color: C.muted }}><Mail className="w-3.5 h-3.5" /> {g.email}</p>}
                </div>
                <button type="button" onClick={() => open(g)} aria-label={`Edit ${g.name}`} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer hover:bg-[#EEF9FF]" style={{ color: C.primaryDark }}><Pencil className="w-4 h-4" /></button>
                <button type="button" onClick={() => remove(g)} aria-label={`Remove ${g.name}`} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            )
          ))}

          {editing && (
            <form onSubmit={submit} className={`${card} p-5 space-y-4`} style={cardBorder}>
              <h2 className="font-serif-display text-lg font-bold">{editing === 'new' ? 'Add a guest' : 'Edit guest'}</h2>
              <Field label="Full name"><input className={inputCls} style={cardBorder} value={form.name} onChange={set('name')} maxLength={50} required autoFocus /></Field>
              <Field label="Contact number"><input type="tel" className={inputCls} style={cardBorder} value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" maxLength={20} required /></Field>
              <Field label="Email (optional)"><input type="email" className={inputCls} style={cardBorder} value={form.email} onChange={set('email')} placeholder="guest@example.com" /></Field>
              <Notice message={message} />
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className={primaryBtn} style={{ background: C.primary }}>{saving ? 'Saving...' : 'Save Guest'}</button>
                <button type="button" onClick={() => setEditing(null)} className="rounded-full border px-6 py-2.5 text-sm font-semibold cursor-pointer bg-white" style={{ ...cardBorder, color: C.ink }}>Cancel</button>
              </div>
            </form>
          )}

          {!editing && (
            <>
              <Notice message={message} />
              <button type="button" onClick={() => open(null)} className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3.5 text-sm font-semibold cursor-pointer bg-white" style={{ borderColor: C.primary, color: C.primaryDark }}>
                <Plus className="w-4 h-4" /> Add guest
              </button>
            </>
          )}
        </div>
      )}
    </AccountShell>
  )
}
