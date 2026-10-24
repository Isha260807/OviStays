import { useEffect, useRef, useState } from "react"
import { Info, Phone, Upload, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { adminAPI } from "../services/adminAPI.js"
import { uploadImage, uploadPdf, IMAGE_TYPES, MAX_IMAGE_MB, MAX_PDF_MB } from "@/services/api/uploads.js"
import { assetUrl } from "@/services/api/config.js"
import { errorMessage } from "@/services/api/axios.js"
import { useBranding } from "@/core/settings/branding.store.js"

const INPUT = "w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
const LABEL = "block text-xs font-semibold text-slate-700 mb-1.5"
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const TYPO_DOMAINS = ["gnali.com", "gmai.com", "gamil.com", "gmail.con", "gmail.comm", "yahoo.comm", "yahoo.con", "hotmal.com", "hotmail.con"]

const badEmailDomain = (email) => {
  const domain = email.split("@")[1]?.toLowerCase()
  return TYPO_DOMAINS.includes(domain) || domain?.endsWith(".comm")
}

// Every upload box on the page: where it is stored, how it is processed and what to show.
const ASSETS = [
  { key: "logo", label: "Main Logo (Admin / Default)", hint: "Click to upload main logo", preset: "logo" },
  { key: "userLogo", label: "User App Logo", hint: "Upload User App Logo", preset: "logo" },
  { key: "hotelLogo", label: "Hotel Panel Logo", hint: "Upload Hotel Panel Logo", preset: "logo" },
  { key: "favicon", label: "Favicon", hint: "Click to upload favicon", preset: "favicon" },
  { key: "termsAndConditionsPdf", label: "T&C PDF (For Hotel Onboarding)", hint: "Click to upload T&C PDF", pdf: true },
]

const emptyAssets = () => Object.fromEntries(ASSETS.map((a) => [a.key, { url: "", file: null, preview: null }]))

export default function BusinessSetup() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    companyName: "", email: "", region: "India", phoneCountryCode: "+91", phoneNumber: "",
    address: "", state: "", pincode: "", gstin: "",
    supportEmail: "", supportPhone: "", supportHours: "",
    currency: "INR", commissionRate: "", platformFee: "", gstRate: "", cancelHours: "",
  })
  // For each asset: the saved url, a newly chosen file (uploaded on save) and its local preview
  const [assets, setAssets] = useState(emptyAssets)

  const load = async () => {
    try {
      setLoading(true)
      const s = await adminAPI.getSettings()
      setForm({
        companyName: s.companyName || "", email: s.email || "", region: s.region || "India",
        phoneCountryCode: s.phoneCountryCode || "+91", phoneNumber: s.phoneNumber || "",
        address: s.address || "", state: s.state || "", pincode: s.pincode || "", gstin: s.gstin || "",
        supportEmail: s.supportEmail || "", supportPhone: s.supportPhone || "", supportHours: s.supportHours || "",
        currency: s.currency || "INR", commissionRate: s.commissionRate ?? "", platformFee: s.platformFee ?? "",
        gstRate: s.gstRate ?? "", cancelHours: s.cancelHours ?? "",
      })
      setAssets(Object.fromEntries(ASSETS.map((a) => [a.key, { url: s[a.key]?.url || "", file: null, preview: null }])))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const change = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const digits = (field, value) => change(field, value.replace(/\D/g, ""))

  const pickFile = (key, file, pdf) => {
    const types = pdf ? ["application/pdf"] : IMAGE_TYPES
    if (!types.includes(file.type)) {
      toast.error(pdf ? "Invalid file type. Please upload a PDF." : "Invalid file type. Please upload PNG, JPG, WEBP or GIF.")
      return
    }
    const maxMb = pdf ? MAX_PDF_MB : MAX_IMAGE_MB
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`File size exceeds ${maxMb}MB limit.`)
      return
    }
    setAssets((prev) => ({ ...prev, [key]: { ...prev[key], file, preview: pdf ? null : URL.createObjectURL(file) } }))
  }

  const clearAsset = (key) => setAssets((prev) => ({ ...prev, [key]: { url: "", file: null, preview: null } }))

  const validate = () => {
    const email = form.email.trim()
    if (form.companyName.trim().length < 2) return "Company name must be at least 2 characters long"
    if (!email) return "Email is required"
    if (!EMAIL_REGEX.test(email)) return "Please enter a valid email address"
    if (badEmailDomain(email)) return "Invalid email domain. Please check for typos (e.g., gnali.com, .comm)."
    if (!/^\d{10}$/.test(form.phoneNumber.trim())) return "Phone number must be exactly 10 digits"
    if (!form.state.trim()) return "State is required"
    if (!/^\d{4,10}$/.test(form.pincode.trim())) return "Please enter a valid pincode (4-10 digits)"
    const supportEmail = form.supportEmail.trim()
    if (supportEmail && (!EMAIL_REGEX.test(supportEmail) || badEmailDomain(supportEmail))) return "Please enter a valid support email address"
    if (form.supportPhone.trim() && !/^\d{10}$/.test(form.supportPhone.trim())) return "Support phone number must be exactly 10 digits"
    if (form.gstin.trim() && !/^[0-9A-Za-z]{15}$/.test(form.gstin.trim())) return "GSTIN must be 15 letters or digits"
    if (!assets.logo.url && !assets.logo.file) return "Company logo picture is required. Please upload a logo."
    return ""
  }

  const handleSave = async () => {
    const problem = validate()
    if (problem) {
      toast.error(problem)
      return
    }
    try {
      setSaving(true)
      // Upload any newly chosen files first, then save the settings with their stored paths
      const files = {}
      for (const asset of ASSETS) {
        const { url, file } = assets[asset.key]
        if (file) files[asset.key] = { url: (asset.pdf ? await uploadPdf(file) : await uploadImage(file, asset.preset)).url }
        else files[asset.key] = { url }
      }
      const payload = {
        ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])),
        ...files,
      }
      const saved = await adminAPI.saveSettings(payload)
      useBranding.getState().setSettings(saved) // sidebar, navbar, tab title and favicon update at once
      setAssets(Object.fromEntries(ASSETS.map((a) => [a.key, { url: saved[a.key]?.url || "", file: null, preview: null }])))
      toast.success("Business settings saved successfully")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    await load()
    toast.info("Form reset to saved values")
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-full">
      {/* Page header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Business setup</h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Manage your company information, general configuration and business rules.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 max-w-md">
          <div className="mt-0.5"><Info className="w-4 h-4 text-amber-500" /></div>
          <div className="text-xs lg:text-sm text-slate-700">
            <p className="font-semibold text-amber-700 mb-0.5">Note</p>
            <p>Don&apos;t forget to click the &quot;Save Information&quot; button below to save changes.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Company Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="companyName" className={LABEL}>Company name <span className="text-red-500">*</span></label>
                <input id="companyName" type="text" placeholder="Enter Your Company Name" value={form.companyName} maxLength={50}
                  onChange={(e) => change("companyName", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label htmlFor="email" className={LABEL}>Email <span className="text-red-500">*</span></label>
                <input id="email" type="email" placeholder="Enter Your Email" value={form.email} maxLength={100}
                  onChange={(e) => change("email", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label htmlFor="region" className={LABEL}>Region <span className="text-red-500">*</span></label>
                <select id="region" value={form.region} onChange={(e) => change("region", e.target.value)} className={INPUT}>
                  <option value="India">India</option>
                </select>
              </div>
              <div>
                <label htmlFor="phoneNumber" className={LABEL}>Phone <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <div className="relative w-32">
                    <select aria-label="Country code" value={form.phoneCountryCode} onChange={(e) => change("phoneCountryCode", e.target.value)}
                      className={`${INPUT} pl-8 pr-6 appearance-none`}>
                      <option value="+91">+91 (IN)</option>
                    </select>
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <input id="phoneNumber" type="text" inputMode="numeric" placeholder="Enter Your Phone Number" value={form.phoneNumber} maxLength={10}
                    onChange={(e) => digits("phoneNumber", e.target.value)} className={`${INPUT} flex-1`} />
                </div>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="address" className={LABEL}>Address</label>
                <textarea id="address" rows={2} placeholder="Enter Your Address" value={form.address} maxLength={250}
                  onChange={(e) => change("address", e.target.value)} className={`${INPUT} resize-none`} />
              </div>
              <div>
                <label htmlFor="state" className={LABEL}>State <span className="text-red-500">*</span></label>
                <input id="state" type="text" placeholder="Enter Your State" value={form.state} maxLength={50}
                  onChange={(e) => change("state", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label htmlFor="pincode" className={LABEL}>Pincode <span className="text-red-500">*</span></label>
                <input id="pincode" type="text" inputMode="numeric" placeholder="Enter Your Pincode" value={form.pincode} maxLength={10}
                  onChange={(e) => digits("pincode", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label htmlFor="gstin" className={LABEL}>GSTIN</label>
                <input id="gstin" type="text" placeholder="Enter GSTIN Number" value={form.gstin} maxLength={15}
                  onChange={(e) => change("gstin", e.target.value.toUpperCase())} className={INPUT} />
              </div>

              <div className="md:col-span-2 border-t pt-4 mt-2">
                <h4 className="text-sm font-bold text-slate-800 mb-3">Support Information (Dynamic Support Page)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="supportEmail" className={LABEL}>Support Email</label>
                    <input id="supportEmail" type="email" placeholder="support@ovistays.com" value={form.supportEmail}
                      onChange={(e) => change("supportEmail", e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label htmlFor="supportPhone" className={LABEL}>Support Phone</label>
                    <input id="supportPhone" type="text" inputMode="numeric" placeholder="e.g. 1234567890" value={form.supportPhone} maxLength={10}
                      onChange={(e) => digits("supportPhone", e.target.value)} className={INPUT} />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="supportHours" className={LABEL}>Support Availability Hours</label>
                    <input id="supportHours" type="text" placeholder="e.g., 24/7 Availability" value={form.supportHours}
                      onChange={(e) => change("supportHours", e.target.value)} className={INPUT} />
                  </div>
                </div>
              </div>
            </div>

            {/* Logos, favicon and T&C PDF */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {ASSETS.map((asset) => (
                <AssetBox key={asset.key} asset={asset} value={assets[asset.key]}
                  onPick={(file) => pickFile(asset.key, file, asset.pdf)} onClear={() => clearAsset(asset.key)} />
              ))}
            </div>
          </div>

          <div className="px-4 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Pricing &amp; Tax</h3>
            <p className="text-[11px] text-slate-500 mb-4">Used to work out commission, platform fee and GST whenever a booking is created.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label htmlFor="currency" className={LABEL}>Currency</label>
                <select id="currency" value={form.currency} onChange={(e) => change("currency", e.target.value)} className={INPUT}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              {[
                ["commissionRate", "Hotel commission (%)", 100],
                ["platformFee", "Platform fee per booking", undefined],
                ["gstRate", "GST (%)", 100],
                ["cancelHours", "Free cancellation (hours)", undefined],
              ].map(([field, label, max]) => (
                <div key={field}>
                  <label htmlFor={field} className={LABEL}>{label}</label>
                  <input id={field} type="number" min={0} max={max} step="any" value={form[field]}
                    onChange={(e) => change(field, e.target.value)} className={INPUT} />
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="px-4 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[11px] text-slate-500">
                Changes will only be applied after clicking the <span className="font-semibold">Save Information</span> button.
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleReset} disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Reset
                </button>
                <button type="button" onClick={handleSave} disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {saving ? (<><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>) : "Save Information"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// One dashed upload box: shows the saved image, a freshly chosen preview, or the PDF state.
function AssetBox({ asset, value, onPick, onClear }) {
  const inputRef = useRef(null)
  const { url, file, preview } = value
  const src = preview || assetUrl(url)
  const hasValue = asset.pdf ? Boolean(file || url) : Boolean(src)

  return (
    <div>
      <label htmlFor={`asset-${asset.key}`} className={LABEL}>{asset.label}</label>
      <input
        ref={inputRef}
        id={`asset-${asset.key}`}
        type="file"
        accept={asset.pdf ? "application/pdf" : IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0]
          e.target.value = "" // allows choosing the same file again
          if (picked) onPick(picked)
        }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        className="border border-dashed border-slate-300 rounded-lg bg-slate-50/60 h-28 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors relative overflow-hidden"
      >
        {hasValue ? (
          <>
            {asset.pdf ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-center px-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-red-500 font-bold text-[10px]">PDF</span>
                </div>
                <p className="text-[10px] text-slate-700 font-medium truncate w-full px-2">{file ? file.name : "Current T&C Document"}</p>
                {url && !file && (
                  <a href={assetUrl(url)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-blue-600 hover:underline mt-1 relative z-10">View Document</a>
                )}
              </div>
            ) : (
              <img src={src} alt={`${asset.label} preview`} className="w-full h-full object-contain p-2" />
            )}
            <button type="button" aria-label={`Remove ${asset.label}`}
              onClick={(e) => { e.stopPropagation(); onClear() }}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10">
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="text-center">
            <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">{asset.hint}</p>
          </div>
        )}
      </div>
    </div>
  )
}
