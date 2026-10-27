import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, ChevronRight, Info, LifeBuoy, Loader2, LogOut, MapPin, Pencil, ShieldCheck, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'
import { uploadImage, IMAGE_TYPES, MAX_IMAGE_MB } from '@/services/api/uploads.js'
import { logoutUser } from '@/core/auth/logout.js'
import { useAuthStore } from '@/core/auth/auth.store.js'
import { useAsync } from '../components/useAsync.js'
import { Btn, ErrorBox, Field, Input, Modal, Pill, Spinner } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'
import { ReviewSteps } from './KycPage.jsx'

function Avatar({ photo, name, size = 'h-20 w-20 text-2xl' }) {
  return photo
    ? <img src={assetUrl(photo)} alt="" className={`${size} rounded-full border-2 border-white object-cover shadow`} />
    : <span className={`${size} flex items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700 shadow`}>{(name || '?').trim().charAt(0).toUpperCase()}</span>
}

// Name, email, business and photo, changed from the pencil on the profile card
function EditProfile({ profile, onClose, onSaved }) {
  const fileRef = useRef(null)
  const setUser = useAuthStore((s) => s.setUser)
  const [form, setForm] = useState({ name: profile.name, email: profile.email, businessName: profile.businessName, photo: profile.photo })
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)

  const pick = async (file) => {
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) return toast.error('Choose a JPEG, PNG, WebP or GIF image')
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return toast.error(`Image must be ${MAX_IMAGE_MB} MB or smaller`)
    setUploading(true)
    try {
      const { url } = await uploadImage(file, 'profile')
      setForm((f) => ({ ...f, photo: url }))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const saved = await ownerAPI.saveProfile(form)
      setUser({ ...useAuthStore.getState().user, name: saved.name, photo: saved.photo })
      toast.success('Profile saved')
      onSaved()
    } catch (err) {
      toast.error(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal open title="Edit profile" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Avatar photo={form.photo} name={form.name} />
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Change photo" disabled={uploading} className="absolute -bottom-1 -right-1 rounded-full bg-sky-600 p-2 text-white shadow cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
          </div>
          <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          {form.photo && <button type="button" className="text-xs font-medium text-red-600 cursor-pointer" onClick={() => setForm({ ...form, photo: '' })}>Remove photo</button>}
        </div>
        <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={80} /></Field>
        <Field label="Mobile number" hint="Used to sign in. Contact support to change it."><Input value={profile.phone} disabled /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Business name"><Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} maxLength={100} /></Field>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn type="submit" loading={busy} disabled={uploading}>Save</Btn></div>
      </form>
    </Modal>
  )
}

function Row({ to, onClick, icon: Icon, label, hint, tone }) {
  const body = (
    <>
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-sky-700'}`}><Icon className="h-4 w-4" /></span>
      <span className={`flex-1 text-sm font-medium ${tone === 'danger' ? 'text-red-600' : 'text-slate-800'}`}>{label}</span>
      {hint}
      {tone !== 'danger' && <ChevronRight className="h-4 w-4 text-slate-400" />}
    </>
  )
  const cls = 'flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50'
  return to ? <Link to={to} className={cls}>{body}</Link> : <button type="button" onClick={onClick} className={`${cls} cursor-pointer`}>{body}</button>
}

export default function Profile() {
  const navigate = useNavigate()
  const { data: p, error, loading, reload } = useAsync(() => ownerAPI.profile(), [])
  const [editing, setEditing] = useState(false)
  useEffect(() => { window.scrollTo(0, 0) }, [])

  if (loading && !p) return <Spinner />
  if (error) return <ErrorBox message={error} onRetry={reload} />

  const verified = p.kyc.status === 'Verified'
  const signOut = async () => {
    await logoutUser()
    navigate('/hotel/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <section className="relative flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-5 pb-5 pt-6 text-center">
        <button type="button" onClick={() => setEditing(true)} aria-label="Edit profile" className="absolute right-3 top-3 rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 cursor-pointer"><Pencil className="h-4 w-4" /></button>
        <Avatar photo={p.photo} name={p.name} />
        <h1 className="mt-3 text-xl font-bold text-slate-900">{p.name}</h1>
        <p className="text-sm text-slate-500">{p.phone}{p.email ? ` · ${p.email}` : ''}</p>
        {p.businessName && <p className="text-sm text-slate-500">{p.businessName}</p>}
        <div className="mt-2 flex items-center gap-2"><Pill>{p.kyc.status}</Pill><span className="text-xs text-slate-400">Host ID {p.refId}</span></div>
      </section>

      {!verified && <ReviewSteps status={p.kyc.status} />}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          <li><Row to="/hotel/kyc" icon={ShieldCheck} label="KYC & payout account" hint={<Pill>{p.kyc.status}</Pill>} /></li>
          {verified && <li><Row to="/hotel/earnings" icon={Wallet} label="Earnings & Payouts" /></li>}
          <li><Row to="/hotel/address" icon={MapPin} label="Manage Address" hint={p.address.city ? <span className="max-w-28 truncate text-xs text-slate-400">{p.address.city}</span> : null} /></li>
          <li><Row to="/hotel/support" icon={LifeBuoy} label="Help & Support" /></li>
          <li><Row to="/hotel/about" icon={Info} label="About OviStays" /></li>
          <li><Row onClick={signOut} icon={LogOut} label="Log out" tone="danger" /></li>
        </ul>
      </section>

      {editing && <EditProfile profile={p} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload() }} />}
    </div>
  )
}
