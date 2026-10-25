import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight, FileText, ShieldCheck, Undo2, XCircle } from 'lucide-react'
import api from '@/services/api/axios.js'
import { useAuthStore } from '@/core/auth/auth.store.js'
import { useWishlist } from '@/core/wishlist/wishlist.store.js'
import { C } from '../../components/home/homeUi.jsx'
import { AccountShell, Notice, card, cardBorder, errorText, inputCls } from '../../components/account/AccountUi.jsx'

const LINKS = [
  { label: 'Terms & Conditions', to: '/pages/terms', icon: FileText },
  { label: 'Privacy Policy', to: '/pages/privacy', icon: ShieldCheck },
  { label: 'Refund Policy', to: '/pages/refund', icon: Undo2 },
  { label: 'Cancellation Policy', to: '/pages/cancellation', icon: XCircle },
]

export default function AccountSettings() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const deleteAccount = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await api.delete('/user/account', { data: { confirm: 'DELETE' } })
      clearAuth()
      useWishlist.getState().clear()
      navigate('/auth/login', { replace: true })
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
      setBusy(false)
    }
  }

  return (
    <AccountShell title="Settings & Policies">
      <section className={`${card} overflow-hidden`} style={cardBorder}>
        {LINKS.map((l, i) => (
          <Link key={l.to} to={l.to} className="flex items-center justify-between px-4 py-3.5 border-t first:border-t-0" style={cardBorder}>
            <span className="flex items-center gap-3">
              <l.icon className="w-5 h-5" style={{ color: C.primaryDark }} />
              <span className="text-sm font-medium">{l.label}</span>
            </span>
            <ChevronRight className="w-4 h-4" style={{ color: C.muted }} />
          </Link>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-red-200 bg-red-50/60 p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-red-700"><AlertTriangle className="w-5 h-5" /> Delete account</h2>
        <p className="text-sm mt-1.5 leading-relaxed" style={{ color: C.muted }}>
          Your profile, saved guests and favourites are removed and you can no longer sign in with this number. Booking and payment records are kept as the law requires.
        </p>

        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className="mt-4 rounded-full border border-red-300 bg-white px-6 py-2.5 text-sm font-semibold text-red-700 cursor-pointer">
            Delete my account
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium" style={{ color: C.ink }}>
              Type <span className="font-bold">DELETE</span> to confirm
              <input className={`${inputCls} mt-2`} style={cardBorder} value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus autoComplete="off" />
            </label>
            <Notice message={message} />
            <div className="flex gap-3">
              <button type="button" onClick={deleteAccount} disabled={typed !== 'DELETE' || busy} className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40 cursor-pointer">
                {busy ? 'Deleting...' : 'Delete permanently'}
              </button>
              <button type="button" onClick={() => { setConfirming(false); setTyped(''); setMessage(null) }} className="rounded-full border bg-white px-6 py-2.5 text-sm font-semibold cursor-pointer" style={cardBorder}>Cancel</button>
            </div>
          </div>
        )}
      </section>
    </AccountShell>
  )
}
