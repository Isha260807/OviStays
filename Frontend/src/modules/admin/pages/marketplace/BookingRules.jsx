import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import PageHeader from "../../components/ui/PageHeader.jsx"
import { buttonPrimary, buttonOutline } from "../../components/ui/FormFields.jsx"
import { adminAPI } from "../../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"

const INPUT = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
const NUMS = [
  ["stayGstRate", "GST on the stay (%)", "Charged to guests on top of the villa price"],
  ["instantHoldMinutes", "Instant booking: payment window (minutes)", "Dates are held this long while the guest pays"],
  ["ownerResponseHours", "Request to book: owner reply time (hours)", "The request expires if the owner does not answer"],
  ["payWindowMinutes", "After owner accepts: payment window (minutes)", "How long the guest has to pay"],
  ["checkInOpensHours", "Check-in code works from (hours before start)", ""],
  ["noShowGraceHours", "No-show after the end time (hours)", "A confirmed booking never checked in becomes a no-show"],
  ["autoCheckoutGraceHours", "Auto check-out after the end time (hours)", ""],
]

export default function BookingRules() {
  const [s, setS] = useState(null)
  const [tiers, setTiers] = useState([])
  const [saving, setSaving] = useState(false)
  useEffect(() => { adminAPI.getSettings().then((d) => { setS(d); setTiers(d.refundTiers || []) }).catch((e) => toast.error(errorMessage(e))) }, [])

  if (!s) return <div className="p-6 text-sm text-neutral-500">Loading…</div>

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = Object.fromEntries(NUMS.map(([k]) => [k, Number(s[k])]))
      body.refundTiers = tiers.map((t) => ({ hoursBeforeStart: Number(t.hoursBeforeStart), refundPercent: Number(t.refundPercent) }))
      const saved = await adminAPI.saveSettings(body)
      setS(saved); setTiers(saved.refundTiers || [])
      toast.success("Booking & refund rules saved")
    } catch (err) { toast.error(errorMessage(err)) } finally { setSaving(false) }
  }
  const setTier = (i, k, v) => setTiers(tiers.map((t, j) => (j === i ? { ...t, [k]: v } : t)))
  const sorted = [...tiers].sort((a, b) => b.hoursBeforeStart - a.hoursBeforeStart)

  return (
    <form onSubmit={save} className="space-y-5 p-4 lg:p-6">
      <PageHeader title="Booking & Refund Rules" subtitle="Applies to every villa" actions={<button className={buttonPrimary} disabled={saving}>{saving ? "Saving…" : "Save rules"}</button>} />

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold">Refund when a guest cancels</h2>
        <p className="mb-4 text-sm text-neutral-500">Choose how much of the payment goes back to the guest, depending on how early they cancel. If a host cancels, the guest always gets 100%. You can still change the percentage for one booking from the Bookings list.</p>
        <div className="space-y-2">
          {tiers.map((t, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
              <span>Cancel at least</span>
              <input type="number" min="0" value={t.hoursBeforeStart} onChange={(e) => setTier(i, "hoursBeforeStart", e.target.value)} className={`${INPUT} !w-24`} aria-label="Hours before start" />
              <span>hours before the start → refund</span>
              <input type="number" min="0" max="100" value={t.refundPercent} onChange={(e) => setTier(i, "refundPercent", e.target.value)} className={`${INPUT} !w-24`} aria-label="Refund percent" />
              <span>%</span>
              <button type="button" aria-label="Remove rule" onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" className={buttonOutline} onClick={() => setTiers([...tiers, { hoursBeforeStart: 0, refundPercent: 0 }])}><Plus className="h-4 w-4" /> Add rule</button>
        </div>
        <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
          <p className="font-semibold">What guests will see</p>
          <ul className="mt-1 list-disc pl-5">
            {sorted.map((t, i) => <li key={i}>Cancel {t.hoursBeforeStart}+ hours before: <b>{t.refundPercent}%</b> refund</li>)}
            <li>Later than that: <b>no refund</b></li>
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-4 font-semibold">Timings & tax</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {NUMS.map(([k, label, hint]) => (
            <label key={k} className="block text-sm">
              <span className="mb-1 block font-medium text-neutral-700">{label}</span>
              <input type="number" min="0" step="any" value={s[k] ?? ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} className={INPUT} />
              {hint && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
            </label>
          ))}
        </div>
        <p className="mt-4 text-xs text-neutral-500">Commission, platform fee and the GST on those fees are set in Business Setup. Confirm the stay GST rate with your accountant.</p>
      </section>
    </form>
  )
}
