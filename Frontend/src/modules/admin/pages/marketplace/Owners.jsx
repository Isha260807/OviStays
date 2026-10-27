import { useCallback, useEffect, useState } from "react"
import { Search, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"
import PageHeader from "../../components/ui/PageHeader.jsx"
import StatusBadge from "../../components/ui/StatusBadge.jsx"
import Modal from "../../components/ui/Modal.jsx"
import { buttonOutline, buttonPrimary } from "../../components/ui/FormFields.jsx"
import { adminAPI } from "../../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"
import { assetUrl } from "@/services/api/config.js"

const KYC = ["Submitted", "Verified", "Rejected", "Not Submitted"]
const dt = (v) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-")

function OwnerModal({ id, onClose, onChanged }) {
  const [o, setO] = useState(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => { adminAPI.getOwner(id).then(setO).catch((e) => toast.error(errorMessage(e))) }, [id])

  const act = async (fn, ok) => {
    setBusy(true)
    try { await fn(); toast.success(ok); onChanged(); onClose() } catch (e) { toast.error(errorMessage(e)); setBusy(false) }
  }
  return (
    <Modal open title={o ? `${o.name} (${o.refId})` : "Owner"} onClose={onClose}>
      {!o ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
        <div className="space-y-4 text-sm">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <dt className="text-neutral-500">Phone</dt><dd>{o.phone}</dd>
            <dt className="text-neutral-500">Email</dt><dd>{o.email || "-"}</dd>
            <dt className="text-neutral-500">Business</dt><dd>{o.businessName || "-"}</dd>
            <dt className="text-neutral-500">Account</dt><dd><StatusBadge value={o.status} /></dd>
            <dt className="text-neutral-500">KYC</dt><dd><StatusBadge value={o.kyc.status} /></dd>
            <dt className="text-neutral-500">PAN</dt><dd>{o.kyc.panNumber || "-"} ({o.kyc.panName || "-"})</dd>
            <dt className="text-neutral-500">GSTIN</dt><dd>{o.kyc.gstin || "-"}</dd>
            <dt className="text-neutral-500">Bank</dt><dd>{o.bank.holderName || "-"} · ****{o.bank.last4 || "----"} · {o.bank.ifsc || "-"}</dd>
            <dt className="text-neutral-500">Submitted</dt><dd>{dt(o.kyc.submittedAt)}</dd>
          </dl>
          <div>
            <p className="mb-1 font-semibold">Documents</p>
            {o.kyc.documents.length === 0 ? <p className="text-neutral-500">None uploaded</p> : o.kyc.documents.map((d) => (
              <a key={d.url} href={assetUrl(d.url)} target="_blank" rel="noreferrer" className="mr-3 inline-flex items-center gap-1 text-blue-600 underline"><FileText className="h-4 w-4" />{d.type}</a>
            ))}
          </div>
          <div>
            <p className="mb-1 font-semibold">Villas ({o.villaList.length})</p>
            {o.villaList.map((v) => <p key={v.id} className="text-neutral-600">{v.refId} · {v.name}, {v.city} <StatusBadge value={v.listingStatus || "Draft"} /></p>)}
          </div>
          {o.kyc.status === "Submitted" && (
            <div className="space-y-2 border-t border-neutral-200 pt-4">
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required to reject)" className="w-full rounded-lg border border-neutral-300 p-2 text-sm" rows={2} />
              <div className="flex gap-2">
                <button className={buttonPrimary} disabled={busy} onClick={() => act(() => adminAPI.reviewKyc(id, { action: "verify" }), "Owner verified")}>Verify</button>
                <button className={`${buttonOutline} !text-red-600`} disabled={busy || !reason.trim()} onClick={() => act(() => adminAPI.reviewKyc(id, { action: "reject", reason }), "KYC rejected")}>Reject</button>
              </div>
            </div>
          )}
          <div className="flex gap-2 border-t border-neutral-200 pt-4">
            {["Active", "Suspended"].filter((s) => s !== o.status).map((s) => (
              <button key={s} className={buttonOutline} disabled={busy} onClick={() => window.confirm(`Mark this owner ${s}?${s === "Suspended" ? " They will be signed out." : ""}`) && act(() => adminAPI.setOwnerStatus(id, { status: s }), `Owner ${s.toLowerCase()}`)}>{s === "Active" ? "Reactivate account" : "Suspend account"}</button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Owners() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [kyc, setKyc] = useState("Submitted")
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)

  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])
  const load = useCallback(() => {
    setLoading(true)
    adminAPI.listOwners({ page, kyc: kyc || undefined, search: q || undefined })
      .then((d) => { setItems(d.items); setPages(d.pages) })
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [page, kyc, q])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <PageHeader title="Villa Owners" subtitle="Review KYC and manage host accounts" />
      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 p-4">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, ID" className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm" />
          </div>
          <select value={kyc} onChange={(e) => { setKyc(e.target.value); setPage(1) }} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" aria-label="KYC status">
            <option value="">All KYC statuses</option>{KYC.map((s) => <option key={s}>{s}</option>)}
          </select>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Villas</th><th className="px-4 py-3">KYC</th><th className="px-4 py-3">Account</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {!loading && items.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral-500">No owners found</td></tr>}
              {items.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-500">{o.refId}</td><td className="px-4 py-3 font-medium">{o.name}</td><td className="px-4 py-3">{o.phone}</td><td className="px-4 py-3">{o.villas}</td>
                  <td className="px-4 py-3"><StatusBadge value={o.kycStatus} /></td><td className="px-4 py-3"><StatusBadge value={o.status} /></td>
                  <td className="px-4 py-3 text-right"><button className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-semibold hover:bg-neutral-200" onClick={() => setOpen(o.id)}>{o.kycStatus === "Submitted" ? "Review" : "View"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 text-sm text-neutral-600">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2"><button className={buttonOutline} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className={buttonOutline} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>
        </div>
      </div>
      {open && <OwnerModal id={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  )
}
