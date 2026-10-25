import { useCallback, useEffect, useMemo, useState } from "react"
import { BellRing, Loader2, Search, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { adminAPI } from "../../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"

const TARGET_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "USER", label: "Guests" },
  { value: "HOTEL", label: "Hotels" },
  { value: "CUSTOM", label: "Particular Persons" },
]
const EMPTY_FORM = { title: "", message: "", link: "", targetType: "ALL" }
const keyOf = (r) => `${r.ownerType}:${r.ownerId}`

const toDateLabel = (value) => {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return "N/A"
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })
}

const FIELD = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"

export default function BroadcastNotification() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")
  const [recipients, setRecipients] = useState([])
  const [recipientLoading, setRecipientLoading] = useState(false)
  const [selected, setSelected] = useState([])

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)
      setHistory((await adminAPI.listBroadcasts({ page: 1, limit: 50 })).items)
    } catch (err) {
      toast.error(errorMessage(err))
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  // People to pick from, searched on the server as you type
  useEffect(() => {
    if (form.targetType !== "CUSTOM") {
      setSelected([])
      setSearch("")
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        setRecipientLoading(true)
        const list = await adminAPI.searchRecipients(search.trim())
        if (!cancelled) setRecipients(list)
      } catch {
        if (!cancelled) setRecipients([])
      } finally {
        if (!cancelled) setRecipientLoading(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [form.targetType, search])

  const selectedKeys = useMemo(() => new Set(selected.map(keyOf)), [selected])
  const toggleRecipient = (r) =>
    setSelected((prev) => (prev.some((x) => keyOf(x) === keyOf(r)) ? prev.filter((x) => keyOf(x) !== keyOf(r)) : [...prev, r]))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.title.trim() || !form.message.trim()) return toast.error("Title and message are required")
    if (form.targetType === "CUSTOM" && selected.length === 0) return toast.error("Please select at least one recipient")
    try {
      setSubmitting(true)
      const sent = await adminAPI.createBroadcast({
        ...form,
        title: form.title.trim(),
        message: form.message.trim(),
        link: form.link.trim(),
        targets: form.targetType === "CUSTOM" ? selected.map(({ ownerType, ownerId }) => ({ ownerType, ownerId })) : [],
      })
      toast.success(`Broadcast sent to ${sent.targetCount} ${sent.targetCount === 1 ? "person" : "people"}`)
      setForm(EMPTY_FORM)
      setSelected([])
      setSearch("")
      await loadHistory()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this broadcast? It will also disappear from everyone's inbox.")) return
    try {
      await adminAPI.deleteBroadcast(id)
      toast.success("Broadcast deleted")
      await loadHistory()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="p-2 lg:p-3 bg-slate-50 min-h-full">
      <div className="w-full mx-auto space-y-3">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <BellRing className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Broadcast Notification</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Form */}
          <div className="lg:col-span-4 bg-white rounded-lg shadow-sm border border-slate-200 p-3">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Send Broadcast</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Title</span>
                <input value={form.title} maxLength={100} onChange={set("title")} placeholder="Enter notification title" className={FIELD} />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Target Type</span>
                <select value={form.targetType} onChange={set("targetType")} className={FIELD}>
                  {TARGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Message</span>
                <textarea value={form.message} maxLength={500} onChange={set("message")} placeholder="Enter notification message" rows={4} className={`${FIELD} resize-y`} />
                <span className="mt-1 block text-right text-[10px] text-slate-400">{form.message.length}/500</span>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Link (optional)</span>
                <input value={form.link} onChange={set("link")} placeholder="/offers or https://..." className={FIELD} />
                <span className="mt-1 block text-[10px] text-slate-500">Opens when the notification is tapped. Use a path inside the app or an https link.</span>
              </label>

              {form.targetType === "CUSTOM" && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guests, hotels..." aria-label="Search recipients"
                      className="w-full text-xs bg-transparent outline-none flex-1 min-w-[150px]" />
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 px-1">Selected recipients: {selected.length}</div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                    {recipientLoading ? (
                      <div className="p-3 text-xs text-slate-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</div>
                    ) : recipients.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500">No recipients found.</div>
                    ) : (
                      recipients.map((r) => (
                        <label key={keyOf(r)} className="flex items-start gap-2 px-2 py-2 cursor-pointer hover:bg-slate-50">
                          <input type="checkbox" checked={selectedKeys.has(keyOf(r))} onChange={() => toggleRecipient(r)}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-slate-900 leading-tight">{r.label}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {r.ownerType === "USER" ? "GUEST" : "HOTEL"}{r.subLabel ? ` • ${r.subLabel}` : ""}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-all w-full">
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Broadcast
                </button>
              </div>
            </form>
          </div>

          {/* History */}
          <div className="lg:col-span-8 bg-white rounded-lg shadow-sm border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-sm font-bold text-slate-900">Broadcast History</h2>
              <span className="text-[10px] text-slate-400">Kept for 30 days</span>
            </div>

            {historyLoading ? (
              <div className="py-10 text-xs text-slate-500 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="py-10 text-xs text-slate-500 text-center"><p>No broadcast notifications found.</p></div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["Title", "Message", "Target", "Recipients", "Date"].map((h) => (
                        <th key={h} className="px-3 py-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider">{h}</th>
                      ))}
                      <th className="px-3 py-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {history.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors align-top">
                        <td className="px-3 py-2"><span className="text-[11px] font-semibold text-slate-900">{item.title}</span></td>
                        <td className="px-3 py-2"><span className="text-[11px] text-slate-600 line-clamp-2 max-w-[200px]">{item.message}</span></td>
                        <td className="px-3 py-2"><span className="text-[11px] text-slate-700 whitespace-nowrap">{item.targetLabel}</span></td>
                        <td className="px-3 py-2"><span className="text-[11px] font-medium text-slate-700">{item.targetCount}</span></td>
                        <td className="px-3 py-2 whitespace-nowrap"><span className="text-[11px] text-slate-500">{toDateLabel(item.createdAt)}</span></td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => handleDelete(item._id)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
