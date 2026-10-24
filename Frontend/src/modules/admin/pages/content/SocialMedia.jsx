import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { FaFacebook, FaInstagram, FaXTwitter, FaYoutube, FaLinkedin, FaWhatsapp, FaTelegram } from "react-icons/fa6"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.jsx"
import { adminAPI } from "../../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"

const PLATFORMS = {
  facebook: { label: "Facebook", Icon: FaFacebook, placeholder: "https://facebook.com/yourpage" },
  instagram: { label: "Instagram", Icon: FaInstagram, placeholder: "https://instagram.com/yourprofile" },
  x: { label: "X (Twitter)", Icon: FaXTwitter, placeholder: "https://x.com/yourhandle" },
  youtube: { label: "YouTube", Icon: FaYoutube, placeholder: "https://youtube.com/@yourchannel" },
  linkedin: { label: "LinkedIn", Icon: FaLinkedin, placeholder: "https://linkedin.com/company/yourcompany" },
  whatsapp: { label: "WhatsApp", Icon: FaWhatsapp, placeholder: "https://wa.me/919876543210" },
  telegram: { label: "Telegram", Icon: FaTelegram, placeholder: "https://t.me/yourchannel" },
}

export default function SocialMedia() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [urls, setUrls] = useState({})

  const apply = (page) => setUrls(Object.fromEntries(page.links.map((l) => [l.platform, l.url])))

  useEffect(() => {
    adminAPI.getPage("social")
      .then(apply)
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    const bad = Object.entries(urls).find(([, url]) => url.trim() && !/^https:\/\/\S+$/.test(url.trim()))
    if (bad) {
      toast.error(`${PLATFORMS[bad[0]].label}: the link must start with https://`)
      return
    }
    try {
      setSaving(true)
      const links = Object.keys(PLATFORMS).map((platform) => ({ platform, url: (urls[platform] || "").trim() }))
      apply(await adminAPI.savePage("social", { links }))
      toast.success("Social media links updated successfully")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full bg-slate-50 p-4 lg:p-6 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Social Media</h1>
          <p className="text-sm text-slate-600 mt-1">Links shown in the guest and hotel apps. Leave a field empty to hide that platform.</p>
        </div>

        <Card className="mb-6">
          <CardHeader><CardTitle>Profile links</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Object.entries(PLATFORMS).map(([platform, { label, Icon, placeholder }]) => (
              <div key={platform}>
                <label htmlFor={`social-${platform}`} className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Icon className="h-4 w-4 text-slate-500" /> {label}
                </label>
                <input
                  id={`social-${platform}`}
                  type="url"
                  value={urls[platform] || ""}
                  onChange={(e) => setUrls((prev) => ({ ...prev, [platform]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            ))}
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
