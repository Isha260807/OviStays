import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Heart, Users, Shield, Clock, Star, Award, Building2, BedDouble, MapPin, Plus, X, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.jsx"
import ImageUpload from "@/shared/components/ImageUpload.jsx"
import { adminAPI } from "../../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"
import { useBranding } from "@/core/settings/branding.store.js"

const ICONS = { Heart, Users, Shield, Clock, Star, Award, Building2, BedDouble, MapPin }
// Must match the lists the server accepts; the server derives the background class itself.
const COLORS = [
  { value: "text-pink-600", label: "Pink", bg: "bg-pink-100" },
  { value: "text-blue-600", label: "Blue", bg: "bg-blue-100" },
  { value: "text-green-600", label: "Green", bg: "bg-green-100" },
  { value: "text-orange-600", label: "Orange", bg: "bg-orange-100" },
  { value: "text-purple-600", label: "Purple", bg: "bg-purple-100" },
  { value: "text-red-600", label: "Red", bg: "bg-red-100" },
]
const MAX_FEATURES = 12

const FIELD = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
const LABEL = "block text-sm font-medium text-slate-700"

export default function AboutUs() {
  const companyName = useBranding((s) => s.settings?.companyName) || "OviStays"
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [about, setAbout] = useState({ appName: "", version: "1.0.0", description: "", logo: "", features: [] })

  useEffect(() => {
    adminAPI.getPage("about")
      .then((page) => setAbout({ appName: page.appName, version: page.version, description: page.description, logo: page.logo, features: page.features || [] }))
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const set = (field, value) => setAbout((prev) => ({ ...prev, [field]: value }))

  const addFeature = () =>
    setAbout((prev) => ({
      ...prev,
      features: [...prev.features, { icon: "Heart", title: "", description: "", color: COLORS[0].value, bgColor: COLORS[0].bg, order: prev.features.length }],
    }))

  const removeFeature = (index) => setAbout((prev) => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }))

  const updateFeature = (index, field, value) =>
    setAbout((prev) => {
      const features = [...prev.features]
      features[index] = { ...features[index], [field]: value }
      if (field === "color") features[index].bgColor = COLORS.find((c) => c.value === value)?.bg || ""
      return { ...prev, features }
    })

  const handleSave = async () => {
    try {
      setSaving(true)
      const page = await adminAPI.savePage("about", about)
      setAbout({ appName: page.appName, version: page.version, description: page.description, logo: page.logo, features: page.features || [] })
      toast.success("About page updated successfully")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full bg-slate-50 p-4 lg:p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">About Us</h1>
          <p className="text-sm text-slate-600 mt-1">Manage your About page content</p>
        </div>

        <Card className="mb-6">
          <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="appName" className={LABEL}>App Name</label>
              <input id="appName" value={about.appName} maxLength={60} onChange={(e) => set("appName", e.target.value)} placeholder={companyName} className={FIELD} />
            </div>
            <div>
              <label htmlFor="version" className={LABEL}>Version</label>
              <input id="version" value={about.version} maxLength={20} onChange={(e) => set("version", e.target.value)} placeholder="1.0.0" className={FIELD} />
            </div>
            <div>
              <label htmlFor="description" className={LABEL}>Description</label>
              <textarea id="description" rows={4} value={about.description} maxLength={2000} onChange={(e) => set("description", e.target.value)}
                placeholder="Your trusted partner for finding and booking great stays..." className={`${FIELD} resize-y`} />
            </div>
            <div>
              <span className={`${LABEL} mb-2`}>Logo</span>
              <ImageUpload id="about-logo" value={about.logo} preset="logo" onChange={(url) => set("logo", url)} />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Features</CardTitle>
            <button type="button" onClick={addFeature} disabled={about.features.length >= MAX_FEATURES}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Add Feature
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {about.features.map((feature, index) => {
              const Icon = ICONS[feature.icon] || Heart
              return (
                <Card key={index} className="border-2 py-0">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`${feature.bgColor} rounded-lg p-3 shrink-0`}>
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor={`icon-${index}`} className={LABEL}>Icon</label>
                            <select id={`icon-${index}`} value={feature.icon} onChange={(e) => updateFeature(index, "icon", e.target.value)} className={FIELD}>
                              {Object.keys(ICONS).map((name) => <option key={name} value={name}>{name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor={`color-${index}`} className={LABEL}>Color</label>
                            <select id={`color-${index}`} value={feature.color} onChange={(e) => updateFeature(index, "color", e.target.value)} className={FIELD}>
                              {COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label htmlFor={`title-${index}`} className={LABEL}>Title</label>
                          <input id={`title-${index}`} value={feature.title} maxLength={100} onChange={(e) => updateFeature(index, "title", e.target.value)} placeholder="Feature title" className={FIELD} />
                        </div>
                        <div>
                          <label htmlFor={`desc-${index}`} className={LABEL}>Description</label>
                          <textarea id={`desc-${index}`} rows={3} value={feature.description} maxLength={500} onChange={(e) => updateFeature(index, "description", e.target.value)}
                            placeholder="Feature description" className={`${FIELD} resize-y`} />
                        </div>
                      </div>
                      <button type="button" aria-label={`Remove feature ${index + 1}`} onClick={() => removeFeature(index)}
                        className="rounded-md p-2 text-red-600 hover:bg-red-50 hover:text-red-700">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {about.features.length === 0 && (
              <p className="text-center text-slate-500 py-8">No features added yet. Click &quot;Add Feature&quot; to get started.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <button type="button" onClick={handleSave} disabled={saving}
            className="rounded-md bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
