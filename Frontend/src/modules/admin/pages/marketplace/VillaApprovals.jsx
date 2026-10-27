import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import PageHeader from "../../components/ui/PageHeader.jsx"
import StatusBadge from "../../components/ui/StatusBadge.jsx"
import Modal from "../../components/ui/Modal.jsx"
import { buttonOutline, buttonPrimary } from "../../components/ui/FormFields.jsx"
import { adminAPI } from "../../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"
import { assetUrl } from "@/services/api/config.js"

const STATUSES = ["Pending Approval", "Approved", "Rejected", "Suspended", "Inactive", "Draft"]

function ReviewModal({ villa, onClose, onChanged }) {
  const [info, setInfo] = useState(null)
  const [reason, setReason] = useState("")
  const [cancelBookings, setCancelBookings] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { adminAPI.listingInfo(villa._id).then(setInfo).catch((e) => toast.error(errorMessage(e))) }, [villa._id])

  const act = async (action) => {
    setBusy(true)
    try {
      const r = await adminAPI.reviewListing(villa._id, { action, reason, cancelBookings: action === "suspend" && cancelBookings })
      toast.success(r.cancelledBookings ? `Done. ${r.cancelledBookings} booking(s) cancelled and refunded.` : "Done")
      onChanged(); onClose()
    } catch (e) { toast.error(errorMessage(e)); setBusy(false) }
  }
  const s = villa.listingStatus
  return (
    <Modal open title={`${villa.refId} · ${villa.name}`} onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        <div className="flex gap-4">
          <div className="h-28 w-40 shrink-0 overflow-hidden rounded-lg bg-neutral-100">{villa.coverImage && <img src={assetUrl(villa.coverImage)} alt="" className="h-full w-full object-cover" />}</div>
          <div className="space-y-1">
            <p><StatusBadge value={s} /> <span className="text-neutral-500">{villa.city}{villa.state ? `, ${villa.state}` : ""}</span></p>
            <p className="text-neutral-600">{villa.bedrooms} bed · {villa.bathrooms} bath · up to {villa.maxGuests} guests · {villa.confirmationMode === "request" ? "Request to book" : "Instant"}</p>
            <p className="text-neutral-600">Photos: {(villa.gallery || []).length} · From ₹{Number(villa.startingPrice || 0).toLocaleString("en-IN")}</p>
            {info?.owner && <p className="text-neutral-600">Owner: {info.owner.name} ({info.owner.refId}, {info.owner.phone}) · KYC {info.owner.kyc?.status}</p>}
            <Link to={`/admin/hotels/${villa._id}/details`} className="text-blue-600 underline">Open full details editor</Link>
          </div>
        </div>
        <p className="line-clamp-4 text-neutral-600">{villa.description}</p>
        {info && <p className="text-neutral-500">{info.liveBookings} live booking(s) on this villa.</p>}
        {villa.rejectionReason && <p className="rounded-lg bg-red-50 p-2 text-red-700">Last note: {villa.rejectionReason}</p>}
        {info?.history?.length > 0 && <details><summary className="cursor-pointer font-semibold">History</summary><ul className="mt-1 space-y-0.5 text-xs text-neutral-600">{info.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString("en-IN")} · {h.action}{h.note ? ` · ${h.note}` : ""}</li>)}</ul></details>}
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required to reject or suspend)" rows={2} className="w-full rounded-lg border border-neutral-300 p-2" />
        {s !== "Suspended" && <label className="flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={cancelBookings} onChange={(e) => setCancelBookings(e.target.checked)} /> When suspending, also cancel future bookings and refund guests in full</label>}
        <div className="flex flex-wrap gap-2">
          {s === "Pending Approval" && <button className={buttonPrimary} disabled={busy} onClick={() => act("approve")}>Approve</button>}
          {s === "Pending Approval" && <button className={`${buttonOutline} !text-red-600`} disabled={busy || !reason.trim()} onClick={() => act("reject")}>Reject</button>}
          {s === "Suspended" && <button className={buttonPrimary} disabled={busy} onClick={() => act("reinstate")}>Reinstate</button>}
          {s !== "Suspended" && <button className={`${buttonOutline} !text-red-600`} disabled={busy || !reason.trim()} onClick={() => act("suspend")}>Suspend</button>}
        </div>
      </div>
    </Modal>
  )
}

export default function VillaApprovals() {
  const [status, setStatus] = useState("Pending Approval")
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    adminAPI.list("hotels", { limit: 100 })
      .then((d) => setItems(d.items.filter((h) => (h.listingStatus || "Approved") === status && h.ownerId)))
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [status])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <PageHeader title="Villa Approvals" subtitle="Villas submitted by owners. Only approved villas appear to guests." />
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${status === s ? "border-black bg-black text-white" : "border-neutral-300 bg-white"}`}>{s}</button>)}
        {loading && <Loader2 className="h-4 w-4 animate-spin self-center" />}
      </div>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Villa</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-neutral-500">No villas with status "{status}"</td></tr>}
            {items.map((v) => (
              <tr key={v._id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 text-neutral-500">{v.refId}</td><td className="px-4 py-3 font-medium">{v.name}</td><td className="px-4 py-3">{v.city}</td><td className="px-4 py-3">{v.owner}</td>
                <td className="px-4 py-3"><StatusBadge value={v.listingStatus} /></td>
                <td className="px-4 py-3 text-right"><button className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-semibold hover:bg-neutral-200" onClick={() => setOpen(v)}>{status === "Pending Approval" ? "Review" : "Manage"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <ReviewModal villa={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  )
}
