import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, ChevronRight, FileText, Heart, Loader2, LogOut, Phone, ShieldCheck, Undo2, XCircle } from 'lucide-react'
import api from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'
import { uploadImage, IMAGE_TYPES, MAX_IMAGE_MB } from '@/services/api/uploads.js'
import { useAuthStore } from '@/core/auth/auth.store.js'
import { useWishlist } from '@/core/wishlist/wishlist.store.js'
import { HomeNavbar, BottomNav } from '../../components/home/HomeNav.jsx'
import { C } from '../../components/home/homeUi.jsx'

const card = 'bg-white rounded-2xl border shadow-[0_6px_20px_rgba(22,138,211,0.06)]'
const LINKS = [
  { label: 'Terms & Conditions', to: '/pages/terms', icon: FileText },
  { label: 'Privacy Policy', to: '/pages/privacy', icon: ShieldCheck },
  { label: 'Refund Policy', to: '/pages/refund', icon: Undo2 },
  { label: 'Cancellation Policy', to: '/pages/cancellation', icon: XCircle },
]
const input = 'w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#55B8F5]/40 focus:border-[#55B8F5]'

const errorText = (err) => err?.response?.data?.message || err?.message || 'Something went wrong'

function Row({ to, icon: Icon, label, onClick, danger }) {
  const inner = (
    <>
      <span className="flex items-center gap-3">
        <Icon className="w-5 h-5" style={{ color: danger ? '#DC2626' : C.primaryDark }} />
        <span className="text-sm font-medium" style={{ color: danger ? '#DC2626' : C.ink }}>{label}</span>
      </span>
      {!danger && <ChevronRight className="w-4 h-4" style={{ color: C.muted }} />}
    </>
  )
  const cls = 'flex items-center justify-between w-full px-4 py-3.5 text-left'
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={`${cls} cursor-pointer`}>{inner}</button>
}

export default function Profile() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const authUser = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const favourites = useWishlist((s) => s.ids.length)

  const [profile, setProfile] = useState(authUser)
  const [name, setName] = useState(authUser?.name || '')
  const [email, setEmail] = useState(authUser?.email || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null) // { ok, text }

  useEffect(() => {
    let alive = true
    api.get('/user/profile')
      .then((res) => {
        if (!alive) return
        const p = res.data.data
        setProfile(p)
        setName(p.name || '')
        setEmail(p.email || '')
        setUser({ ...authUser, ...p })
      })
      .catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async (patch) => {
    const res = await api.patch('/user/profile', patch)
    const p = res.data.data
    setProfile(p)
    setUser({ ...authUser, ...p })
    return p
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await save({ name, email })
      setMessage({ ok: true, text: 'Profile updated' })
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
    } finally {
      setSaving(false)
    }
  }

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) return setMessage({ ok: false, text: 'Only JPEG, PNG, WebP and GIF images are allowed' })
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return setMessage({ ok: false, text: `Photo must be ${MAX_IMAGE_MB} MB or smaller` })
    setUploading(true)
    setMessage(null)
    try {
      const { url } = await uploadImage(file, 'profile')
      await save({ photo: url })
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
    } finally {
      setUploading(false)
    }
  }

  const logout = () => {
    clearAuth()
    useWishlist.getState().clear()
    navigate('/auth/login', { replace: true })
  }

  const initial = (profile?.name || 'G').trim().charAt(0).toUpperCase()
  const dirty = name !== (profile?.name || '') || email !== (profile?.email || '')

  return (
    <div className="min-h-screen pb-24 md:pb-0 antialiased" style={{ background: C.cream, color: C.ink }}>
      <HomeNavbar />
      <main className="max-w-[1100px] mx-auto px-4 md:px-6 lg:px-10 pt-6 md:pt-10 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8 lg:items-start">
        {/* Who is signed in */}
        <section className={`${card} p-6 flex flex-col items-center text-center`} style={{ borderColor: '#E2EDF5' }}>
          <div className="relative">
            <span className="block w-24 h-24 rounded-full overflow-hidden ring-4 ring-white shadow-[0_4px_14px_rgba(22,138,211,0.25)] flex items-center justify-center text-3xl font-bold text-white" style={{ background: C.primary }}>
              {profile?.photo ? <img src={assetUrl(profile.photo)} alt="Your photo" className="w-full h-full object-cover" /> : initial}
            </span>
            <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(',')} onChange={pickPhoto} className="sr-only" />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Change photo"
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full text-white flex items-center justify-center shadow cursor-pointer disabled:opacity-60" style={{ background: C.primaryDark }}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
          </div>
          <h1 className="font-serif-display text-2xl font-bold mt-4">{profile?.name || 'Guest'}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: C.muted }}><Phone className="w-4 h-4" /> {profile?.phone}</p>
          {profile?.email && <p className="text-sm mt-0.5" style={{ color: C.muted }}>{profile.email}</p>}
        </section>

        <div className="mt-6 lg:mt-0 space-y-6">
          {/* Edit details */}
          <form onSubmit={submit} className={`${card} p-5 space-y-4`} style={{ borderColor: '#E2EDF5' }}>
            <h2 className="font-serif-display text-xl font-bold">Edit Profile</h2>
            <label className="block">
              <span className="block text-xs font-semibold mb-1.5" style={{ color: C.muted }}>Full name</span>
              <input className={input} style={{ borderColor: '#E2EDF5' }} value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold mb-1.5" style={{ color: C.muted }}>Email (optional)</span>
              <input type="email" className={input} style={{ borderColor: '#E2EDF5' }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold mb-1.5" style={{ color: C.muted }}>Mobile number</span>
              <input className={`${input} bg-[#F5FAFE] cursor-not-allowed`} style={{ borderColor: '#E2EDF5', color: C.muted }} value={profile?.phone || ''} readOnly />
              <span className="block text-[11px] mt-1" style={{ color: C.muted }}>You sign in with this number, so it cannot be changed here.</span>
            </label>
            {message && <p role="status" className={`text-sm font-medium ${message.ok ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>}
            <button type="submit" disabled={saving || !dirty} className="rounded-full px-7 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer" style={{ background: C.primary }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Shortcuts and policies */}
          <section className={`${card} divide-y overflow-hidden`} style={{ borderColor: '#E2EDF5' }}>
            <div style={{ borderColor: '#E2EDF5' }}>
              <Row to="/wishlist" icon={Heart} label={`My Favourites${favourites ? ` (${favourites})` : ''}`} />
            </div>
            {LINKS.map((l) => (
              <div key={l.to} style={{ borderColor: '#E2EDF5' }}><Row to={l.to} icon={l.icon} label={l.label} /></div>
            ))}
            <div style={{ borderColor: '#E2EDF5' }}><Row icon={LogOut} label="Log out" onClick={logout} danger /></div>
          </section>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
