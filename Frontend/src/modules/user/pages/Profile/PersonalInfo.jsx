import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import api from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'
import { uploadImage, IMAGE_TYPES, MAX_IMAGE_MB } from '@/services/api/uploads.js'
import { useAuthStore } from '@/core/auth/auth.store.js'
import { useProfile } from '@/core/profile/profile.store.js'
import { C } from '../../components/home/homeUi.jsx'
import { AccountShell, Field, Notice, card, cardBorder, errorText, inputCls, primaryBtn } from '../../components/account/AccountUi.jsx'

const todayYmd = () => new Date().toISOString().slice(0, 10)

export default function PersonalInfo() {
  const fileRef = useRef(null)
  const authUser = useAuthStore((s) => s.user)

  const [profile, setProfile] = useState(authUser)
  const [form, setForm] = useState({ name: authUser?.name || '', email: authUser?.email || '', dob: '', gender: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)

  const fill = (p) => setForm({ name: p.name || '', email: p.email || '', dob: p.dob || '', gender: p.gender || '' })

  useEffect(() => {
    let alive = true
    useProfile.getState().load()
      .then((p) => {
        if (!alive) return
        setProfile(p)
        fill(p)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const save = async (patch) => {
    const res = await api.patch('/user/profile', patch)
    const p = res.data.data
    setProfile(p)
    useProfile.getState().setProfile(p)
    return p
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      fill(await save(form))
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

  const initial = (profile?.name || 'G').trim().charAt(0).toUpperCase()
  const dirty = ['name', 'email', 'dob', 'gender'].some((k) => form[k] !== (profile?.[k] || ''))

  return (
    <AccountShell title="Personal Information">
      <div className="flex justify-center mb-5">
        <div className="relative">
          <span className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white shadow-[0_4px_14px_rgba(22,138,211,0.25)] flex items-center justify-center text-3xl font-bold text-white" style={{ background: C.primary }}>
            {profile?.photo ? <img src={assetUrl(profile.photo)} alt="Your photo" className="w-full h-full object-cover" /> : initial}
          </span>
          <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(',')} onChange={pickPhoto} className="sr-only" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Change photo"
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full text-white flex items-center justify-center shadow cursor-pointer disabled:opacity-60" style={{ background: C.primaryDark }}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <form onSubmit={submit} className={`${card} p-5 space-y-4`} style={cardBorder}>
        <Field label="Full name"><input className={inputCls} style={cardBorder} value={form.name} onChange={set('name')} maxLength={50} required /></Field>
        <Field label="Email (optional)"><input type="email" className={inputCls} style={cardBorder} value={form.email} onChange={set('email')} placeholder="you@example.com" /></Field>
        <Field label="Mobile number" hint="You sign in with this number, so it cannot be changed here.">
          <input className={`${inputCls} bg-[#F5FAFE] cursor-not-allowed`} style={{ ...cardBorder, color: C.muted }} value={profile?.phone || ''} readOnly />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date of birth (optional)"><input type="date" className={inputCls} style={cardBorder} value={form.dob} onChange={set('dob')} min="1900-01-01" max={todayYmd()} /></Field>
          <Field label="Gender (optional)">
            <select className={inputCls} style={cardBorder} value={form.gender} onChange={set('gender')}>
              <option value="">Prefer not to say</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </Field>
        </div>
        <Notice message={message} />
        <button type="submit" disabled={saving || !dirty} className={primaryBtn} style={{ background: C.primary }}>{saving ? 'Saving...' : 'Save Changes'}</button>
      </form>
    </AccountShell>
  )
}
