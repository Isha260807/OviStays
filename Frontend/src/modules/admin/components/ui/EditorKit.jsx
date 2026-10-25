import { useRef, useState } from "react"
import { toast } from "sonner"
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2, Video } from "lucide-react"
import { uploadVideo, VIDEO_TYPES, MAX_VIDEO_MB } from "@/services/api/uploads.js"
import { assetUrl } from "@/services/api/config.js"
import { errorMessage } from "@/services/api/axios.js"

// Small form pieces shared by the Home Page Design and Villa Details editors
export const INPUT = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
export const LABEL = "mb-1 block text-sm font-medium text-neutral-700"
export const GHOST_BTN = "inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
export const ICON_BTN = "w-8 h-8 rounded-lg border border-neutral-200 bg-white text-neutral-600 flex items-center justify-center hover:bg-neutral-50 disabled:opacity-30 cursor-pointer"

export function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  )
}

export function TextInput({ value, onChange, ...rest }) {
  return <input className={INPUT} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />
}

export function Select({ value, onChange, options, placeholder = "Select..." }) {
  return (
    <select className={INPUT} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <span className="relative w-10 h-6 rounded-full bg-neutral-300 peer-checked:bg-emerald-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
      {label}
    </label>
  )
}

// A video is uploaded right away and its path kept, like ImageUpload does for photos
export function VideoUpload({ value, onChange }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!VIDEO_TYPES.includes(file.type)) return toast.error("Only MP4, WebM and MOV videos are allowed")
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) return toast.error(`Video must be ${MAX_VIDEO_MB} MB or smaller`)
    try {
      setBusy(true)
      const { url } = await uploadVideo(file)
      onChange(url)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center">
        {value ? <video src={assetUrl(value)} muted className="h-full w-full object-cover" /> : <Video className="h-5 w-5 text-neutral-400" />}
        {busy && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <input ref={ref} type="file" accept={VIDEO_TYPES.join(",")} onChange={pick} className="sr-only" />
        <button type="button" disabled={busy} onClick={() => ref.current?.click()} className={GHOST_BTN}>{value ? "Change video" : "Upload video"}</button>
        {value && <button type="button" onClick={() => onChange("")} className="text-xs font-semibold text-red-600 cursor-pointer">Remove</button>}
        <p className="text-xs text-neutral-500">MP4, WebM or MOV, up to {MAX_VIDEO_MB} MB. Keep it short.</p>
      </div>
    </div>
  )
}

// Rows editor shared by categories, weekend tiles and reels
export function Rows({ items, onChange, blank, addLabel, render }) {
  const set = (i, patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const move = (i, d) => {
    const next = [...items]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400">#{i + 1}</span>
            <div className="flex gap-1.5">
              <button type="button" className={ICON_BTN} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ChevronUp className="w-4 h-4" /></button>
              <button type="button" className={ICON_BTN} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ChevronDown className="w-4 h-4" /></button>
              <button type="button" className={ICON_BTN} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="w-4 h-4 text-red-600" /></button>
            </div>
          </div>
          {render(it, (patch) => set(i, patch))}
        </div>
      ))}
      <button type="button" className={GHOST_BTN} onClick={() => onChange([...items, { ...blank }])}><Plus className="w-4 h-4" /> {addLabel}</button>
    </div>
  )
}

