import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Building2, CalendarCheck, ShieldCheck, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/services/api/axios.js'
import { useAuthStore } from '@/core/auth/auth.store.js'
import { ownerAPI } from '../services/ownerAPI.js'
import { Btn, Field, Input } from '../components/ui.jsx'

const PERKS = [
  { icon: Building2, text: 'List several villas under one account' },
  { icon: CalendarCheck, text: 'Control your calendar, prices and bookings' },
  { icon: Wallet, text: 'Track earnings and payouts in one place' },
  { icon: ShieldCheck, text: 'Guests are verified; you confirm each arrival' },
]

// One screen for sign in and sign up. Step 1 asks for the details, step 2 for the OTP sent to the phone.
export default function OwnerAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, role, setAuth } = useAuthStore()
  const [mode, setMode] = useState('login')
  const [step, setStep] = useState('details')
  const [form, setForm] = useState({ name: '', phone: '', email: '', businessName: '', acceptTerms: false })
  const [otp, setOtp] = useState('')
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  if (token && role === 'hotel') return <Navigate to={location.state?.from || '/hotel'} replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const sendOtp = async (e) => {
    e?.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = mode === 'signup' ? await ownerAPI.register(form) : await ownerAPI.sendOtp({ phone: form.phone })
      setHint(res.demoOtp ? `Test mode: your OTP is ${res.demoOtp}` : `We sent an OTP to ${res.phone}`)
      setStep('otp')
      setCooldown(30)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await ownerAPI.verifyOtp({ phone: form.phone, otp })
      setAuth({ token: res.token, refreshToken: res.refreshToken, user: res.owner, role: 'hotel' })
      toast.success(mode === 'signup' ? 'Welcome! Complete your profile to start listing villas.' : 'Welcome back')
      navigate(mode === 'signup' ? '/hotel/profile' : (location.state?.from || '/hotel'), { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 lg:grid lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-center gap-8 bg-sky-700 p-14 text-white">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-200">OviStays for hosts</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">Run your villas the easy way</h1>
        </div>
        <ul className="space-y-4">
          {PERKS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sky-50"><span className="rounded-lg bg-white/15 p-2"><Icon className="w-5 h-5" /></span>{text}</li>
          ))}
        </ul>
      </aside>

      <main className="flex min-h-dvh items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-slate-900">{step === 'otp' ? 'Enter the OTP' : mode === 'login' ? 'Host sign in' : 'Become a host'}</h2>
          <p className="mt-1 text-sm text-slate-500">{step === 'otp' ? hint : mode === 'login' ? 'Use the mobile number you registered with.' : 'Create your host account in a minute.'}</p>

          {step === 'details' ? (
            <form onSubmit={sendOtp} className="mt-6 space-y-4">
              {mode === 'signup' && (
                <>
                  <Field label="Your name"><Input value={form.name} onChange={set('name')} required minLength={2} maxLength={80} autoComplete="name" /></Field>
                  <Field label="Business name (optional)"><Input value={form.businessName} onChange={set('businessName')} maxLength={100} /></Field>
                  <Field label="Email (optional)"><Input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
                </>
              )}
              <Field label="Mobile number"><Input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} required placeholder="+91 98765 43210" autoComplete="tel" /></Field>
              {mode === 'signup' && (
                <label className="flex items-start gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={form.acceptTerms} onChange={set('acceptTerms')} className="mt-1" />
                  <span>I agree to the host Terms &amp; Conditions and Privacy Policy.</span>
                </label>
              )}
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <Btn type="submit" className="w-full" loading={busy} disabled={mode === 'signup' && !form.acceptTerms}>Send OTP</Btn>
              <p className="text-center text-sm text-slate-500">
                {mode === 'login' ? 'New host?' : 'Already a host?'}{' '}
                <button type="button" className="font-semibold text-sky-700 cursor-pointer" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
                  {mode === 'login' ? 'Create an account' : 'Sign in'}
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-6 space-y-4">
              <Field label="6-digit OTP"><Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus required className="tracking-[0.5em] text-center text-lg" /></Field>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <Btn type="submit" className="w-full" loading={busy} disabled={otp.length < 6}>Verify &amp; continue</Btn>
              <div className="flex justify-between text-sm">
                <button type="button" className="text-slate-500 cursor-pointer" onClick={() => { setStep('details'); setOtp(''); setError('') }}>Change number</button>
                <button type="button" disabled={cooldown > 0 || busy} className="font-semibold text-sky-700 disabled:text-slate-400 cursor-pointer" onClick={sendOtp}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}</button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
