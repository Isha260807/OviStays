import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'
import { uploadImage, IMAGE_TYPES, MAX_IMAGE_MB } from '@/services/api/uploads.js'
import { useAsync } from '../components/useAsync.js'
import { Btn, Card, ErrorBox, Field, Input, PageTitle, Pill, Select, Spinner, Tabs, Textarea, TimeInput } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'
import { toPaise, toRupees } from '@/shared/utils/booking.js'

// The form is long, so it is shown one section at a time
const SECTIONS = [
  { key: 'basics', label: 'Basics' },
  { key: 'location', label: 'Location' },
  { key: 'photos', label: 'Photos' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'booking', label: 'Booking' },
  { key: 'rules', label: 'Rules' },
]

// Day bookings are for daytime only, so their times stay between these two
const DAY_FROM = '06:00'
const DAY_TO = '18:00'
// Night stays check in from noon onwards and check out the next morning
const NIGHT_IN_FROM = '12:00'
const NIGHT_OUT_FROM = '05:00'
const NIGHT_OUT_TO = '12:00'
const laterBy5 = (t) => { const m = Math.min(Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) + 5, 18 * 60); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }

const EMPTY = {
  name: '', description: '', propertyType: 'Private Villa', address: '', locality: '', city: '', state: '', country: 'India', pincode: '', mapUrl: '', geo: null,
  coverImage: '', gallery: [], bedrooms: 1, beds: 1, bathrooms: 1, maxGuests: 4, amenities: [], houseRules: [],
  checkInTime: '12:00', checkOutTime: '11:00', allowSameDay: true, timezone: 'Asia/Kolkata', confirmationMode: 'instant', maxAdvanceDays: 365,
  pricing: { basePricePaise: 0, weekendPricePaise: 0, weeklyDiscountPct: 0, monthlyDiscountPct: 0, cleaningFeePaise: 0 },
  bookingModes: {
    night: { enabled: true, minNights: 1, maxNights: 30 },
    day: { enabled: false, startTime: '10:00', endTime: '18:00', pricePaise: 0, maxGuests: 0 },
    fullDayNight: { enabled: false, startTime: '10:00', endTime: '10:00', pricePaise: 0, maxGuests: 0 },
    weekly: { enabled: false, minNights: 7, maxNights: 365, pricePerNightPaise: 0 },
    monthly: { enabled: false, minNights: 28, maxNights: 365, pricePerNightPaise: 0 },
  },
}
const PHOTO_CATEGORIES = ['Exterior', 'Living', 'Bedroom', 'Bathroom', 'Kitchen', 'Pool', 'Garden', 'Other']

// Rupee input that stores whole paise in the form
function Money({ value, onChange, ...rest }) {
  return <Input type="number" min="0" step="1" inputMode="numeric" value={toRupees(value)} onChange={(e) => onChange(toPaise(e.target.value))} {...rest} />
}

function PhotoUploader({ cover, gallery, onCover, onGallery }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(0)

  const upload = async (files) => {
    for (const file of files) {
      if (!IMAGE_TYPES.includes(file.type)) { toast.error(`${file.name}: only JPEG, PNG, WebP and GIF images are allowed`); continue }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) { toast.error(`${file.name} is larger than ${MAX_IMAGE_MB} MB`); continue }
      setBusy((n) => n + 1)
      try {
        const { url } = await uploadImage(file, 'hotel')
        onGallery((g) => [...g, { url, category: 'Exterior' }])
        if (!cover) onCover(url)
      } catch (err) {
        toast.error(errorMessage(err))
      } finally {
        setBusy((n) => n - 1)
      }
    }
  }

  return (
    <div className="space-y-3">
      <input ref={ref} type="file" accept={IMAGE_TYPES.join(',')} multiple className="sr-only" onChange={(e) => { upload([...e.target.files]); e.target.value = '' }} />
      <Btn variant="outline" onClick={() => ref.current?.click()} disabled={busy > 0}>{busy > 0 ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} Add photos</Btn>
      <p className="text-xs text-slate-500">Add at least 3 photos. Choose one as the cover photo.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {gallery.map((g, i) => (
          <div key={g.url} className="overflow-hidden rounded-lg border border-slate-200">
            <div className="relative aspect-[4/3] bg-slate-100">
              <img src={assetUrl(g.url)} alt="" className="h-full w-full object-cover" loading="lazy" />
              <button type="button" aria-label="Remove photo" onClick={() => { onGallery((list) => list.filter((_, j) => j !== i)); if (cover === g.url) onCover('') }} className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-red-600 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              {cover === g.url && <span className="absolute left-1.5 top-1.5 rounded bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold text-white">COVER</span>}
            </div>
            <div className="flex items-center gap-1 p-1.5">
              <Select value={g.category} onChange={(e) => onGallery((list) => list.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))} className="!py-1 text-xs" aria-label="Photo category">{PHOTO_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
              {cover !== g.url && <button type="button" onClick={() => onCover(g.url)} className="shrink-0 text-xs font-semibold text-sky-700 cursor-pointer">Cover</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function VillaForm() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [rule, setRule] = useState('')
  const [dirty, setDirty] = useState(false)
  const [tab, setTab] = useState('basics')

  const loaded = useAsync(async () => (isNew ? null : ownerAPI.villa(id)), [id])
  const amenities = useAsync(() => ownerAPI.amenities(), [])
  const states = useAsync(() => ownerAPI.locations(), [])
  // cities other villas already use in the chosen state, offered as suggestions while typing
  const cityHints = useAsync(() => (form.state ? ownerAPI.cities(form.state) : Promise.resolve([])), [form.state])
  const villa = loaded.data

  useEffect(() => {
    if (!villa) return
    // Booking types a villa has not set up yet fall back to the defaults
    setForm({ ...EMPTY, ...villa, bookingModes: { ...EMPTY.bookingModes, ...villa.bookingModes } })
  }, [villa])
  useEffect(() => {
    if (!dirty) return undefined
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const edit = (patch) => { setForm((f) => ({ ...f, ...patch })); setDirty(true) }
  const editIn = (key, patch) => edit({ [key]: { ...form[key], ...patch } })
  const editMode = (mode, patch) => edit({ bookingModes: { ...form.bookingModes, [mode]: { ...form.bookingModes[mode], ...patch } } })
  const num = (k) => (e) => edit({ [k]: e.target.value === '' ? '' : Number(e.target.value) })
  const txt = (k) => (e) => edit({ [k]: e.target.value })

  const save = async (andSubmit = false) => {
    setSaving(true)
    try {
      const body = { ...form }
      delete body.id; delete body.refId; delete body.listingStatus; delete body.rejectionReason; delete body.submittedAt; delete body.approvedAt; delete body.isPublic; delete body.createdAt; delete body.updatedAt; delete body.rating
      const saved = isNew ? await ownerAPI.createVilla(body) : await ownerAPI.saveVilla(id, body)
      setDirty(false)
      if (andSubmit) {
        try {
          await ownerAPI.submitVilla(saved.id)
          toast.success('Saved and sent for approval')
        } catch (err) {
          toast.error(errorMessage(err))
        }
      } else toast.success('Villa saved')
      if (isNew || andSubmit) navigate('/hotel/villas')
      else setForm({ ...EMPTY, ...saved })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loaded.loading && !isNew && !villa) return <Spinner />
  if (loaded.error) return <ErrorBox message={loaded.error} onRetry={loaded.reload} />

  const m = form.bookingModes
  const sec = (k) => (tab === k ? 'space-y-5' : 'hidden')
  const locked = form.listingStatus === 'Suspended'
  const offer = (mode, text) => <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={m[mode].enabled} onChange={(e) => editMode(mode, { enabled: e.target.checked })} /> {text}</label>
  const toggleAmenity = (aid) => edit({ amenities: form.amenities.includes(aid) ? form.amenities.filter((a) => a !== aid) : [...form.amenities, aid] })
  const addRule = () => { if (rule.trim()) { edit({ houseRules: [...form.houseRules, rule.trim()] }); setRule('') } }
  const lat = form.geo?.lat ?? ''
  const lng = form.geo?.lng ?? ''
  const setGeo = (k, v) => {
    const next = { lat: lat, lng: lng, [k]: v }
    edit({ geo: next.lat === '' || next.lng === '' ? (next.lat === '' && next.lng === '' ? null : next) : { lat: Number(next.lat), lng: Number(next.lng) } })
  }

  return (
    <>
      <PageTitle title={isNew ? 'Add a villa' : form.name || 'Edit villa'} subtitle={isNew ? 'Start with the basics. You can save a draft and finish later.' : undefined}
        actions={!isNew && <Pill>{form.listingStatus || 'Draft'}</Pill>} />
      {locked && <div className="mb-4"><ErrorBox message="This villa is suspended. Please contact support to change it." /></div>}
      {form.listingStatus === 'Rejected' && form.rejectionReason && <div className="mb-4"><ErrorBox message={`Not approved: ${form.rejectionReason}. Fix this and submit again.`} /></div>}

      <Tabs tabs={SECTIONS} value={tab} onChange={setTab} />

      <fieldset disabled={locked} className="pb-24 pt-5">
        <div className={sec('basics')}>
        <Card title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Villa name" className="sm:col-span-2"><Input value={form.name} onChange={txt('name')} maxLength={80} required /></Field>
            <Field label="Property type"><Input value={form.propertyType} onChange={txt('propertyType')} maxLength={40} /></Field>
            <Field label="Description" className="sm:col-span-2" hint={`${form.description.length}/2000. Tell guests what makes it special (at least 30 characters).`}><Textarea rows={5} value={form.description} onChange={txt('description')} maxLength={2000} /></Field>
          </div>
        </Card>

        </div>

        <div className={sec('location')}>
        <Card title="Location">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full address" className="sm:col-span-2"><Input value={form.address} onChange={txt('address')} maxLength={250} /></Field>
            <Field label="Locality / area"><Input value={form.locality} onChange={txt('locality')} maxLength={80} /></Field>
            <Field label="State" hint={states.data?.length === 0 ? 'No states are available yet. Please ask the OviStays team to add yours.' : 'Only states added by OviStays can be chosen.'}>
              <Select value={form.state} required onChange={(e) => edit({ state: e.target.value })}>
                <option value="">Select state…</option>
                {/* a villa saved before this list changed keeps its own state */}
                {form.state && !(states.data || []).some((x) => x.state === form.state) && <option value={form.state}>{form.state}</option>}
                {(states.data || []).map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
              </Select>
            </Field>
            <Field label="City" hint="The city or town of your villa, inside the state.">
              <Input value={form.city} list="villa-cities" required maxLength={60} placeholder="e.g. Jaipur" onChange={txt('city')} />
              <datalist id="villa-cities">{(cityHints.data || []).map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Country"><Input value={form.country} onChange={txt('country')} maxLength={60} /></Field>
            <Field label="Pincode"><Input value={form.pincode} onChange={txt('pincode')} inputMode="numeric" maxLength={10} /></Field>
            <Field label="Google Maps link" hint="Paste the share link of your villa's pin (https)."><Input value={form.mapUrl} onChange={txt('mapUrl')} placeholder="https://maps.app.goo.gl/..." /></Field>
            <Field label="Latitude" hint="Optional, helps search by distance."><Input type="number" step="any" value={lat} onChange={(e) => setGeo('lat', e.target.value)} /></Field>
            <Field label="Longitude"><Input type="number" step="any" value={lng} onChange={(e) => setGeo('lng', e.target.value)} /></Field>
          </div>
        </Card>

        </div>

        <div className={sec('photos')}>
        <Card title="Photos"><PhotoUploader cover={form.coverImage} gallery={form.gallery} onCover={(u) => edit({ coverImage: u })} onGallery={(fn) => setForm((f) => { setDirty(true); return { ...f, gallery: typeof fn === 'function' ? fn(f.gallery) : fn } })} /></Card>

        </div>

        <div className={sec('rooms')}>
        <Card title="Rooms and capacity">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Bedrooms"><Input type="number" min="0" value={form.bedrooms} onChange={num('bedrooms')} /></Field>
            <Field label="Beds"><Input type="number" min="0" value={form.beds} onChange={num('beds')} /></Field>
            <Field label="Bathrooms"><Input type="number" min="0" value={form.bathrooms} onChange={num('bathrooms')} /></Field>
            <Field label="Max guests"><Input type="number" min="1" value={form.maxGuests} onChange={num('maxGuests')} /></Field>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-slate-700">Amenities and facilities</p>
            <div className="flex flex-wrap gap-2">
              {(amenities.data || []).map((a) => (
                <button key={a.id} type="button" onClick={() => toggleAmenity(a.id)} aria-pressed={form.amenities.includes(a.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm cursor-pointer ${form.amenities.includes(a.id) ? 'border-sky-600 bg-sky-50 font-semibold text-sky-700' : 'border-slate-300 text-slate-600'}`}>{a.name}</button>
              ))}
              {amenities.data?.length === 0 && <p className="text-sm text-slate-500">No amenities have been set up yet.</p>}
            </div>
          </div>
        </Card>

        </div>

        <div className={sec('booking')}>
        <Card title="How guests can book">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Confirmation" hint="Instant: confirmed as soon as the guest pays. Request: you accept first, then the guest pays.">
              <Select value={form.confirmationMode} onChange={txt('confirmationMode')}><option value="instant">Instant booking</option><option value="request">Request to book (I approve each one)</option></Select>
            </Field>
            <Field label="Bookings open up to (days ahead)"><Input type="number" min="1" max="730" value={form.maxAdvanceDays} onChange={num('maxAdvanceDays')} /></Field>
          </div>
          <p className="mt-4 text-xs text-slate-500">All booking types share one calendar: a day, a night, a full day & night, a weekly and a monthly stay can never overlap.</p>
        </Card>

        <Card title="Day" action={offer('day', 'Offer day bookings')}>
          {m.day.enabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From" hint="The whole villa for the daytime (6 AM to 6 PM) of one date."><TimeInput min={DAY_FROM} max="17:55" value={m.day.startTime} onChange={(e) => editMode('day', { startTime: e.target.value, ...(m.day.endTime <= e.target.value ? { endTime: laterBy5(e.target.value) } : {}) })} /></Field>
              <Field label="To"><TimeInput min={laterBy5(m.day.startTime)} max={DAY_TO} value={m.day.endTime} onChange={(e) => editMode('day', { endTime: e.target.value })} /></Field>
              <Field label="Price (₹)"><Money value={m.day.pricePaise} onChange={(v) => editMode('day', { pricePaise: v })} /></Field>
              <Field label="Max guests" hint="0 = the villa's maximum guests."><Input type="number" min="0" value={m.day.maxGuests} onChange={(e) => editMode('day', { maxGuests: Number(e.target.value) })} /></Field>
            </div>
          )}
        </Card>

        <Card title="Night" action={<label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={m.night.enabled} onChange={(e) => editMode('night', { enabled: e.target.checked })} /> Offer night stays</label>}>
          {m.night.enabled && <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price per night (₹)"><Money value={form.pricing.basePricePaise} onChange={(v) => editIn('pricing', { basePricePaise: v })} /></Field>
            <Field label="Fri & Sat night price (₹)" hint="Leave empty to use the normal price."><Money value={form.pricing.weekendPricePaise} onChange={(v) => editIn('pricing', { weekendPricePaise: v })} /></Field>
            <Field label="Cleaning fee (₹)" hint="Charged once per booking."><Money value={form.pricing.cleaningFeePaise} onChange={(v) => editIn('pricing', { cleaningFeePaise: v })} /></Field>
            <Field label="Minimum nights"><Input type="number" min="1" value={m.night.minNights} onChange={(e) => editMode('night', { minNights: Number(e.target.value) })} /></Field>
            <Field label="Maximum nights"><Input type="number" min="1" value={m.night.maxNights} onChange={(e) => editMode('night', { maxNights: Number(e.target.value) })} /></Field>
            <span />
            <Field label="Weekly stay discount (%)" hint="7 nights or more"><Input type="number" min="0" max="90" value={form.pricing.weeklyDiscountPct} onChange={(e) => editIn('pricing', { weeklyDiscountPct: Number(e.target.value) })} /></Field>
            <Field label="Monthly stay discount (%)" hint="28 nights or more"><Input type="number" min="0" max="90" value={form.pricing.monthlyDiscountPct} onChange={(e) => editIn('pricing', { monthlyDiscountPct: Number(e.target.value) })} /></Field>
            <Field label="Check-in time" hint="From 12 PM to 11:55 PM."><TimeInput min={NIGHT_IN_FROM} max="23:55" value={form.checkInTime} onChange={txt('checkInTime')} /></Field>
            <Field label="Check-out time" hint="Next morning, 5 AM to 12 PM."><TimeInput min={NIGHT_OUT_FROM} max={NIGHT_OUT_TO} value={form.checkOutTime} onChange={txt('checkOutTime')} /></Field>
            <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" className="mt-1" checked={form.allowSameDay} onChange={(e) => edit({ allowSameDay: e.target.checked })} /><span><b>Allow same-day bookings</b><span className="block text-xs text-slate-500">If a guest books tonight after your check-in time has passed, their stay starts from the moment they book and still ends at your normal check-out time. No extra time is given. Same-day arrival must be before midnight.</span></span></label>
          </div>}
        </Card>

        <Card title="Full day & night" action={offer('fullDayNight', 'Offer full day & night')}>
          {m.fullDayNight.enabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Check-in time" hint="On the date the guest picks."><TimeInput value={m.fullDayNight.startTime} onChange={(e) => editMode('fullDayNight', { startTime: e.target.value })} /></Field>
              <Field label="Check-out time" hint="The next day."><TimeInput value={m.fullDayNight.endTime} onChange={(e) => editMode('fullDayNight', { endTime: e.target.value })} /></Field>
              <Field label="Price (₹)" hint="One price for the whole villa, day and night."><Money value={m.fullDayNight.pricePaise} onChange={(v) => editMode('fullDayNight', { pricePaise: v })} /></Field>
              <Field label="Max guests" hint="0 = the villa's maximum guests."><Input type="number" min="0" value={m.fullDayNight.maxGuests} onChange={(e) => editMode('fullDayNight', { maxGuests: Number(e.target.value) })} /></Field>
            </div>
          )}
        </Card>

        <Card title="Weekly" action={offer('weekly', 'Offer weekly stays')}>
          {m.weekly.enabled && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Price per night (₹)" hint="Charged for every night of a weekly stay."><Money value={m.weekly.pricePerNightPaise} onChange={(v) => editMode('weekly', { pricePerNightPaise: v })} /></Field>
              <Field label="Minimum nights" hint="Guests pick any dates from the calendar, at least this many nights."><Input type="number" min="1" value={m.weekly.minNights} onChange={(e) => editMode('weekly', { minNights: Number(e.target.value) })} /></Field>
              <Field label="Maximum nights"><Input type="number" min="1" value={m.weekly.maxNights} onChange={(e) => editMode('weekly', { maxNights: Number(e.target.value) })} /></Field>
            </div>
          )}
        </Card>

        <Card title="Monthly" action={offer('monthly', 'Offer monthly stays')}>
          {m.monthly.enabled && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Price per night (₹)" hint="Charged for every night of a monthly stay."><Money value={m.monthly.pricePerNightPaise} onChange={(v) => editMode('monthly', { pricePerNightPaise: v })} /></Field>
              <Field label="Minimum nights" hint="Guests pick any dates from the calendar, at least this many nights."><Input type="number" min="1" value={m.monthly.minNights} onChange={(e) => editMode('monthly', { minNights: Number(e.target.value) })} /></Field>
              <Field label="Maximum nights"><Input type="number" min="1" value={m.monthly.maxNights} onChange={(e) => editMode('monthly', { maxNights: Number(e.target.value) })} /></Field>
            </div>
          )}
        </Card>
        </div>

        <div className={sec('rules')}>
        <Card title="House rules and cancellation">
          <ul className="mb-3 space-y-1.5">
            {form.houseRules.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">{r}<button type="button" aria-label="Remove rule" onClick={() => edit({ houseRules: form.houseRules.filter((_, j) => j !== i) })} className="text-red-600 cursor-pointer"><X className="w-4 h-4" /></button></li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input value={rule} onChange={(e) => setRule(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRule() } }} placeholder="e.g. No loud music after 10 pm" maxLength={150} />
            <Btn variant="outline" onClick={addRule}>Add</Btn>
          </div>
          <p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-800">Refunds follow OviStays' platform cancellation policy, which guests see before they pay. If you cancel a confirmed booking, the guest is refunded in full.</p>
        </Card>
        </div>
      </fieldset>

      <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <span className="text-xs text-slate-500">{dirty ? 'You have unsaved changes' : 'All changes saved'}</span>
          <div className="flex gap-2">
            <Btn variant="outline" onClick={() => navigate('/hotel/villas')}>Back</Btn>
            <Btn variant="outline" loading={saving} onClick={() => save(false)} disabled={locked}>Save {isNew ? 'draft' : 'changes'}</Btn>
            {(isNew || ['Draft', 'Rejected'].includes(form.listingStatus)) && <Btn loading={saving} onClick={() => save(true)} disabled={locked}>Save &amp; submit</Btn>}
          </div>
        </div>
      </div>
    </>
  )
}
