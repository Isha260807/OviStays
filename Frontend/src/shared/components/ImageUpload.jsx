import { useRef, useState } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { uploadImage, IMAGE_TYPES, MAX_IMAGE_MB } from "@/services/api/uploads.js"
import { assetUrl } from "@/services/api/config.js"
import { errorMessage } from "@/services/api/axios.js"

// Picks an image, uploads it right away and reports the stored path through onChange.
// value: stored path or URL. preset: server-side size preset (hotel | room | banner | profile | misc).
export default function ImageUpload({ id, value, onChange, preset = "misc" }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = "" // lets the same file be chosen again
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP and GIF images are allowed")
      return
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Image must be ${MAX_IMAGE_MB} MB or smaller`)
      return
    }
    try {
      setUploading(true)
      setProgress(0)
      const { url } = await uploadImage(file, preset, setProgress)
      onChange(url)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-neutral-300 bg-neutral-50">
        {value ? (
          <img src={assetUrl(value)} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-6 w-6 text-neutral-400" />
        )}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 text-xs font-semibold text-neutral-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            {progress}%
          </div>
        )}
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <input ref={inputRef} id={id} type="file" accept={IMAGE_TYPES.join(",")} onChange={handleFile} className="sr-only" />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
        >
          {value ? "Replace image" : "Choose image"}
        </button>
        {value && !uploading && (
          <button type="button" onClick={() => onChange("")} className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline">
            <X className="h-3 w-3" /> Remove
          </button>
        )}
        <p className="text-[11px] text-neutral-500">JPEG, PNG, WebP or GIF, up to {MAX_IMAGE_MB} MB</p>
      </div>
    </div>
  )
}
