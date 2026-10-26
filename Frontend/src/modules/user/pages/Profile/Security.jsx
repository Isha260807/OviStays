import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, Laptop, Mail } from 'lucide-react'
import api from '@/services/api/axios.js'
import { useProfile } from '@/core/profile/profile.store.js'
import { logoutUser } from '@/core/auth/logout.js'
import { C } from '../../components/home/homeUi.jsx'
import { AccountShell, Field, Notice, card, cardBorder, errorText, inputCls, primaryBtn } from '../../components/account/AccountUi.jsx'
import { timeAgo } from '../../utils/format.js'

function EmailSection() {
  const [profile, setProfile] = useState(null)
  const [sent, setSent] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    useProfile.getState().load().then(setProfile).catch(() => {})
  }, [])

  const send = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await api.post('/user/profile/email/send-otp')
      setSent(res.data.data)
      setMessage({ ok: true, text: res.data.message })
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const res = await api.post('/user/profile/email/verify', { otp: code })
      setProfile(res.data.data)
      useProfile.getState().setProfile(res.data.data)
      setSent(null)
      setCode('')
      setMessage({ ok: true, text: 'Email verified' })
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`${card} p-5`} style={cardBorder}>
      <h2 className="flex items-center gap-2 text-base font-bold"><Mail className="w-5 h-5" style={{ color: C.primaryDark }} /> Email</h2>
      {!profile ? null : !profile.email ? (
        <p className="text-sm mt-2" style={{ color: C.muted }}>Add an email in Personal Information to get booking receipts.</p>
      ) : profile.emailVerified ? (
        <p className="mt-2 flex items-center gap-2 text-sm"><span className="font-semibold">{profile.email}</span> <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700"><BadgeCheck className="w-3.5 h-3.5" /> Verified</span></p>
      ) : (
        <div className="mt-2 space-y-3">
          <p className="text-sm"><span className="font-semibold">{profile.email}</span> <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">Not verified</span></p>
          {!sent ? (
            <button type="button" onClick={send} disabled={busy} className={primaryBtn} style={{ background: C.primary }}>{busy ? 'Sending...' : 'Send verification code'}</button>
          ) : (
            <form onSubmit={verify} className="space-y-3">
              {sent.demoOtp && <p className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-center" style={{ background: '#EEF9FF', color: C.primaryDark }}>Demo code: <span className="font-mono font-bold text-[#111]">{sent.demoOtp}</span></p>}
              <Field label="6-digit code">
                <input className={`${inputCls} tracking-[0.4em] text-center font-mono`} style={cardBorder} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus />
              </Field>
              <div className="flex gap-3">
                <button type="submit" disabled={busy || code.length < 6} className={primaryBtn} style={{ background: C.primary }}>{busy ? 'Checking...' : 'Verify'}</button>
                <button type="button" onClick={send} disabled={busy} className="rounded-full border bg-white px-5 py-2.5 text-sm font-semibold cursor-pointer" style={cardBorder}>Resend</button>
              </div>
            </form>
          )}
        </div>
      )}
      <div className="mt-3"><Notice message={message} /></div>
    </section>
  )
}

function Devices() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState(null)
  const [message, setMessage] = useState(null)

  const load = () => api.get('/user/auth/sessions').then((res) => setSessions(res.data.data)).catch(() => setSessions([]))
  useEffect(() => { load() }, [])

  const revoke = async (id) => {
    try {
      await api.delete(`/user/auth/sessions/${id}`)
      setSessions((list) => list.filter((s) => s.id !== id))
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
    }
  }

  const logoutOthers = async () => {
    try {
      await api.post('/user/auth/logout-all', { others: true })
      load()
      setMessage({ ok: true, text: 'Logged out of all other devices' })
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
    }
  }

  const logoutEverywhere = async () => {
    try {
      await api.post('/user/auth/logout-all')
    } catch {
      // the session is cleared on this device either way
    }
    await logoutUser()
    navigate('/auth/login', { replace: true })
  }

  return (
    <section className={`${card} p-5`} style={cardBorder}>
      <h2 className="flex items-center gap-2 text-base font-bold"><Laptop className="w-5 h-5" style={{ color: C.primaryDark }} /> Where you are signed in</h2>
      <p className="text-xs mt-0.5" style={{ color: C.muted }}>If you do not recognise a device, log it out.</p>

      <ul className="mt-3">
        {(sessions || []).map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-3 border-t first:border-t-0" style={cardBorder}>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{s.device} {s.current && <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">This device</span>}</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>Last active {timeAgo(s.lastUsedAt)}{s.ip ? ` · ${s.ip}` : ''}</p>
            </div>
            {!s.current && <button type="button" onClick={() => revoke(s.id)} className="shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold text-red-600 cursor-pointer" style={cardBorder}>Log out</button>}
          </li>
        ))}
        {sessions === null && <li className="py-3 text-sm" style={{ color: C.muted }}>Loading...</li>}
      </ul>

      <div className="mt-3"><Notice message={message} /></div>
      <div className="mt-4 flex flex-wrap gap-3">
        {sessions?.length > 1 && <button type="button" onClick={logoutOthers} className="rounded-full border bg-white px-5 py-2.5 text-sm font-semibold cursor-pointer" style={cardBorder}>Log out other devices</button>}
        <button type="button" onClick={logoutEverywhere} className="rounded-full border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 cursor-pointer">Log out everywhere</button>
      </div>
    </section>
  )
}

export default function Security() {
  return (
    <AccountShell title="Login & Security">
      <div className="space-y-5">
        <EmailSection />
        <Devices />
      </div>
    </AccountShell>
  )
}
