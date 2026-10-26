import { useEffect, useState } from 'react'
import api from '@/services/api/axios.js'
import { C } from '../../components/home/homeUi.jsx'
import { AccountShell, Notice, card, cardBorder, errorText } from '../../components/account/AccountUi.jsx'

const GROUPS = [
  {
    title: 'What you hear about',
    rows: [
      { key: 'bookingUpdates', label: 'Booking updates', hint: 'Confirmations, reminders and changes to your stays' },
      { key: 'offers', label: 'Offers & deals', hint: 'Coupons and new villas you may like' },
    ],
  },
  {
    title: 'How we reach you',
    rows: [
      { key: 'push', label: 'App notifications', hint: 'Alerts on this device' },
      { key: 'email', label: 'Email', hint: 'Needs a verified email address' },
      { key: 'sms', label: 'SMS', hint: 'Text messages to your mobile number' },
    ],
  },
]

function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange} className="relative w-11 h-6 shrink-0 rounded-full transition-colors cursor-pointer" style={{ background: on ? C.primaryDark : '#CBD5E1' }}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

// Each switch saves as soon as it is tapped
export default function Preferences() {
  const [prefs, setPrefs] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    api.get('/user/profile/preferences').then((res) => setPrefs(res.data.data)).catch(() => setMessage({ ok: false, text: 'Could not load your settings' }))
  }, [])

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setMessage(null)
    try {
      await api.put('/user/profile/preferences', { [key]: next[key] })
    } catch (err) {
      setPrefs(prefs)
      setMessage({ ok: false, text: errorText(err) })
    }
  }

  return (
    <AccountShell title="Notification Settings">
      <Notice message={message} />
      {prefs && GROUPS.map((g) => (
        <section key={g.title} className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: C.muted }}>{g.title}</h2>
          <div className={`${card} overflow-hidden`} style={cardBorder}>
            {g.rows.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-4 px-4 py-3.5 border-t first:border-t-0" style={cardBorder}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{r.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>{r.hint}</p>
                </div>
                <Switch on={prefs[r.key]} onChange={() => toggle(r.key)} label={r.label} />
              </div>
            ))}
          </div>
        </section>
      ))}
      <p className="text-xs" style={{ color: C.muted }}>Important messages about a booking you made are always sent.</p>
    </AccountShell>
  )
}
