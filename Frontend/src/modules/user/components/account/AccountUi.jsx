import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { HomeNavbar, BottomNav } from '../home/HomeNav.jsx'
import { C } from '../home/homeUi.jsx'

export const card = 'bg-white rounded-2xl border shadow-[0_6px_20px_rgba(22,138,211,0.06)]'
export const cardBorder = { borderColor: '#E2EDF5' }
export const inputCls = 'w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#55B8F5]/40 focus:border-[#55B8F5]'
export const primaryBtn = 'rounded-full px-7 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer'

export const errorText = (err) => err?.response?.data?.message || err?.message || 'Something went wrong'

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold mb-1.5" style={{ color: C.muted }}>{label}</span>
      {children}
      {hint && <span className="block text-[11px] mt-1" style={{ color: C.muted }}>{hint}</span>}
    </label>
  )
}

export function Notice({ message }) {
  if (!message) return null
  return <p role="status" className={`text-sm font-medium ${message.ok ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>
}

// Page frame for the profile sub-pages: navbar, back button with a title, bottom tabs
export function AccountShell({ title, back = '/profile', children }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen pb-24 md:pb-0 antialiased" style={{ background: C.cream, color: C.ink }}>
      <HomeNavbar />
      <main className="max-w-[640px] mx-auto px-4 md:px-6 pt-5 md:pt-10 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={() => navigate(back)} aria-label="Back" className="w-10 h-10 rounded-full bg-white border flex items-center justify-center cursor-pointer" style={cardBorder}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif-display text-2xl lg:text-3xl font-bold">{title}</h1>
        </div>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
