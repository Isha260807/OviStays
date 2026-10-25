import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import PageHeader from "../components/ui/PageHeader.jsx"
import { buttonPrimary } from "../components/ui/FormFields.jsx"
import ImageUpload from "@/shared/components/ImageUpload.jsx"
import { adminAPI } from "../services/adminAPI.js"
import { INPUT, Field, TextInput, Select, VideoUpload, Rows } from "../components/ui/EditorKit.jsx"
import { errorMessage } from "@/services/api/axios.js"

const TABS = [
  { id: "basics", label: "Basics" },
  { id: "highlights", label: "Highlights" },
  { id: "gallery", label: "Photo gallery" },
  { id: "amenities", label: "Amenities" },
  { id: "spaces", label: "Inside the villa" },
  { id: "policies", label: "Policies & map" },
]

const ICONS = [
  { value: "bed", label: "Bed" }, { value: "bath", label: "Bathroom" }, { value: "guests", label: "Guests" },
  { value: "wifi", label: "WiFi" }, { value: "parking", label: "Parking" }, { value: "pool", label: "Pool" },
  { value: "ac", label: "AC" }, { value: "kitchen", label: "Kitchen" },
]
const GALLERY_CATEGORIES = ["Exterior", "Rooms & Suites", "Dining", "Pool", "Garden", "Bathroom"]

const Card = ({ title, note, children }) => (
  <div className="rounded-xl border border-neutral-200 bg-white p-5">
    <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
    {note && <p className="mt-1 mb-4 text-sm text-neutral-500">{note}</p>}
    {!note && <div className="mb-4" />}
    {children}
  </div>
)

const Num = ({ value, onChange, ...rest }) => (
  <input type="number" min={0} className={INPUT} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} {...rest} />
)

export default function HotelDetailsEdit() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [amenities, setAmenities] = useState([])
  const [tab, setTab] = useState("basics")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let alive = true
    Promise.all([adminAPI.getHotelDetails(id), adminAPI.options("amenities").catch(() => [])])
      .then(([details, list]) => { if (alive) { setData(details); setAmenities(list) } })
      .catch((err) => alive && setError(errorMessage(err)))
    return () => { alive = false }
  }, [id])

  if (error) return <div className="p-6 text-red-700">{error}</div>
  if (!data) return <div className="flex items-center gap-2 p-6 text-neutral-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>

  const set = (patch) => setData((d) => ({ ...d, ...patch }))
  const toggleAmenity = (value) =>
    set({ amenities: data.amenities.includes(value) ? data.amenities.filter((x) => x !== value) : [...data.amenities, value] })

  const save = async () => {
    setSaving(true)
    try {
      setData(await adminAPI.saveHotelDetails(id, data))
      toast.success("Villa details saved")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const tabCls = (active) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-colors cursor-pointer ${active ? "bg-black text-white border-black" : "bg-white border-neutral-300 text-neutral-800 hover:bg-neutral-50"}`

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <Link to="/admin/hotels/all" className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900">
        <ArrowLeft className="w-4 h-4" /> All Hotels
      </Link>
      <PageHeader
        title={`Villa details: ${data.name}`}
        subtitle={`${data.city} · what guests see on the villa page${data.status !== "Active" ? ` (status: ${data.status}, hidden until Active)` : ""}`}
        actions={<button type="button" onClick={save} disabled={saving} className={buttonPrimary}>{saving ? "Saving..." : "Save Changes"}</button>}
      />

      <datalist id="gallery-categories">{GALLERY_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>

      <div role="tablist" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tabCls(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === "basics" && (
        <Card title="Basics">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cover photo" className="sm:col-span-2"><ImageUpload id="cover" value={data.coverImage} preset="hotel" onChange={(coverImage) => set({ coverImage })} /></Field>
            <Field label="Property type (small tag above the name)"><TextInput value={data.propertyType} onChange={(propertyType) => set({ propertyType })} maxLength={40} placeholder="Private Villa" /></Field>
            <Field label="Price per night (₹)"><Num value={data.startingPrice} onChange={(startingPrice) => set({ startingPrice })} /></Field>
            <Field label="Bedrooms"><Num value={data.bedrooms} onChange={(bedrooms) => set({ bedrooms })} /></Field>
            <Field label="Bathrooms"><Num value={data.bathrooms} onChange={(bathrooms) => set({ bathrooms })} /></Field>
            <Field label="Maximum guests"><Num value={data.maxGuests} onChange={(maxGuests) => set({ maxGuests })} /></Field>
            <Field label="About video (optional)"><VideoUpload value={data.videoUrl} onChange={(videoUrl) => set({ videoUrl })} /></Field>
            <Field label="About this property" className="sm:col-span-2">
              <textarea rows={6} className={INPUT} value={data.description} maxLength={2000} onChange={(e) => set({ description: e.target.value })} />
            </Field>
          </div>
        </Card>
      )}

      {tab === "highlights" && (
        <Card title="Highlights" note="Up to 3 short facts shown in a card under the name (for example 4 BHK, Free WiFi, Free Parking). Leave empty to show bedrooms, guests and bathrooms automatically.">
          <Rows
            items={data.highlights}
            onChange={(highlights) => set({ highlights: highlights.slice(0, 3) })}
            blank={{ icon: "bed", title: "", subtitle: "" }}
            addLabel="Add highlight"
            render={(h, upd) => (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Icon"><Select value={h.icon} onChange={(icon) => upd({ icon: icon || "bed" })} options={ICONS} /></Field>
                <Field label="Title"><TextInput value={h.title} onChange={(title) => upd({ title })} maxLength={30} placeholder="Free WiFi" /></Field>
                <Field label="Small text"><TextInput value={h.subtitle} onChange={(subtitle) => upd({ subtitle })} maxLength={30} placeholder="Available" /></Field>
              </div>
            )}
          />
        </Card>
      )}

      {tab === "gallery" && (
        <Card title="Photo gallery" note="Each photo has a category (Exterior, Rooms & Suites, Dining...). Guests can filter the gallery by category. The cover photo always comes first.">
          <Rows
            items={data.gallery}
            onChange={(gallery) => set({ gallery })}
            blank={{ url: "", category: "Exterior" }}
            addLabel="Add photo"
            render={(g, upd) => (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Photo"><ImageUpload id={`g-${g.url}`} value={g.url} preset="hotel" onChange={(url) => upd({ url })} /></Field>
                <Field label="Category">
                  <input className={INPUT} list="gallery-categories" value={g.category ?? ""} onChange={(e) => upd({ category: e.target.value })} maxLength={30} />
                </Field>
              </div>
            )}
          />
        </Card>
      )}

      {tab === "amenities" && (
        <Card title="Amenities" note="Tick what this villa offers. Add new ones in Rooms > Amenities.">
          {amenities.length === 0 ? (
            <p className="text-sm text-neutral-500">No amenities yet. <Link to="/admin/rooms/amenities" className="underline">Add some</Link> first.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {amenities.map((a) => (
                <label key={a.value} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 cursor-pointer">
                  <input type="checkbox" checked={data.amenities.includes(a.value)} onChange={() => toggleAmenity(a.value)} className="h-4 w-4" />
                  {a.label}
                </label>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "spaces" && (
        <Card title="Inside the villa" note="Optional. Shows the rooms and spaces of the villa for information only. The whole villa is booked together, so there is no price or Book button per room.">
          <Rows
            items={data.spaces}
            onChange={(spaces) => set({ spaces })}
            blank={{ name: "", details: "", image: "" }}
            addLabel="Add room or space"
            render={(s, upd) => (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Name"><TextInput value={s.name} onChange={(name) => upd({ name })} maxLength={40} placeholder="Master Bedroom" /></Field>
                <Field label="Details"><TextInput value={s.details} onChange={(details) => upd({ details })} maxLength={120} placeholder="1 King bed · 350 sq.ft · AC" /></Field>
                <Field label="Photo" className="sm:col-span-2"><ImageUpload id={`s-${s.name}`} value={s.image} preset="room" onChange={(image) => upd({ image })} /></Field>
              </div>
            )}
          />
        </Card>
      )}

      {tab === "policies" && (
        <Card title="Policies & map">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Check-in time"><TextInput value={data.checkInTime} onChange={(checkInTime) => set({ checkInTime })} maxLength={10} placeholder="12:00" /></Field>
            <Field label="Check-out time"><TextInput value={data.checkOutTime} onChange={(checkOutTime) => set({ checkOutTime })} maxLength={10} placeholder="11:00" /></Field>
            <Field label="Cancellation"><TextInput value={data.cancellationPolicy} onChange={(cancellationPolicy) => set({ cancellationPolicy })} maxLength={200} placeholder="Free up to 24 hrs" /></Field>
            <Field label="Payment"><TextInput value={data.paymentInfo} onChange={(paymentInfo) => set({ paymentInfo })} maxLength={120} placeholder="Cards, UPI, Net Banking" /></Field>
            <Field label="Google Maps link (optional)" className="sm:col-span-2">
              <TextInput value={data.mapUrl} onChange={(mapUrl) => set({ mapUrl })} maxLength={500} placeholder="https://maps.google.com/..." />
              <p className="mt-1 text-xs text-neutral-500">Used by the "View on Map" button. Without it, the button searches the address.</p>
            </Field>
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className={buttonPrimary}>{saving ? "Saving..." : "Save Changes"}</button>
      </div>
    </div>
  )
}
