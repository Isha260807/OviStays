import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search, Plus, Eye, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import PageHeader from "../components/ui/PageHeader.jsx"
import StatusBadge from "../components/ui/StatusBadge.jsx"
import Modal from "../components/ui/Modal.jsx"
import { FormGrid, cleanValues, buttonPrimary, buttonOutline } from "../components/ui/FormFields.jsx"
import { adminAPI } from "../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"
import { assetUrl } from "@/services/api/config.js"

const PAGE_SIZE = 10

// config: { title, subtitle, endpoint, columns, statusOptions?, fixedStatus?, statusEditable?, deletable?,
//           addLabel?, addFields?, addPath?, rowActions? }
// column: { key, label, type?: "text"|"status"|"money"|"stars" }
function renderCell(col, row) {
  const v = row[col.key]
  if (v === null || v === undefined || v === "") return <span className="text-neutral-400">-</span>
  if (col.type === "status") return <StatusBadge value={v} />
  if (col.type === "image") {
    return <img src={assetUrl(v)} alt="" loading="lazy" className="h-10 w-14 rounded object-cover border border-neutral-200" />
  }
  if (col.type === "money") return `₹${Number(v).toLocaleString("en-IN")}`
  if (col.type === "stars") {
    const n = Math.round(Number(v))
    return <span className="text-amber-500">{"★".repeat(n)}<span className="text-neutral-300">{"★".repeat(5 - n)}</span></span>
  }
  return v
}

export default function ListPage({ config }) {
  const { title, subtitle, endpoint, columns, statusOptions, fixedStatus, statusEditable, addLabel, addFields, addPath, rowActions } = config
  const deletable = config.deletable !== false
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await adminAPI.list(endpoint, {
        page, limit: PAGE_SIZE, search: debouncedSearch || undefined, status: fixedStatus || status || undefined,
      })
      setItems(data.items)
      setTotal(data.total)
      setPages(data.pages)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [endpoint, page, debouncedSearch, status, fixedStatus])

  useEffect(() => { load() }, [load])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminAPI.create(endpoint, cleanValues(form))
      toast.success(`${title}: entry added`)
      setAdding(false)
      setForm({})
      setPage(1)
      load()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    if (!window.confirm("Delete this record? This cannot be undone.")) return
    try {
      await adminAPI.remove(endpoint, row._id)
      toast.success("Deleted")
      // Step back a page when the last row of a page is removed
      if (items.length === 1 && page > 1) setPage(page - 1)
      else load()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const patch = async (row, body) => {
    try {
      const updated = await adminAPI.update(endpoint, row._id, body)
      toast.success("Updated")
      setViewing((v) => (v && v._id === row._id ? updated : v))
      load()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={addLabel && (
          <button className={buttonPrimary} onClick={() => (addPath ? navigate(addPath) : setAdding(true))}>
            <Plus className="w-4 h-4" /> {addLabel}
          </button>
        )}
      />

      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 p-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>
          {statusOptions && !fixedStatus && (
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <span className="ml-auto flex items-center gap-2 text-sm text-neutral-500">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} {total} records
          </span>
        </div>

        {error && (
          <div role="alert" className="m-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={load} className="font-semibold underline">Retry</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                {columns.map((c) => <th key={c.key} className="px-4 py-3 font-semibold whitespace-nowrap">{c.label}</th>)}
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {!loading && items.length === 0 ? (
                <tr><td colSpan={columns.length + 2} className="px-4 py-12 text-center text-neutral-500">No records found</td></tr>
              ) : items.map((row, i) => (
                <tr key={row._id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-500">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  {columns.map((c) => <td key={c.key} className="px-4 py-3 whitespace-nowrap text-neutral-800 max-w-[260px] truncate">{renderCell(c, row)}</td>)}
                  <td className="px-4 py-3">
                    <div className="flex justify-end items-center gap-1">
                      {rowActions?.map((a) => a.to ? (
                        <Link key={a.label} to={a.to(row)} className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-200">{a.label}</Link>
                      ) : (
                        <button key={a.label} onClick={() => patch(row, a.patch)}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${a.tone === "danger" ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                          {a.label}
                        </button>
                      ))}
                      <button onClick={() => setViewing(row)} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-600" title="View"><Eye className="w-4 h-4" /></button>
                      {deletable && <button onClick={() => handleDelete(row)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 text-sm text-neutral-600">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className={`${buttonOutline} !px-2 !py-1.5`} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className={`${buttonOutline} !px-2 !py-1.5`} aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <Modal open={adding} title={addLabel} onClose={() => setAdding(false)}>
        <form onSubmit={handleAdd} className="space-y-5">
          <FormGrid fields={addFields || []} values={form} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />
          <div className="flex justify-end gap-2">
            <button type="button" className={buttonOutline} onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className={buttonPrimary} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewing} title={`${title} details`} onClose={() => setViewing(null)}>
        {viewing && (
          <div className="space-y-5">
            <dl className="grid grid-cols-3 gap-y-3 text-sm">
              {columns.map((c) => (
                <div key={c.key} className="contents">
                  <dt className="text-neutral-500">{c.label}</dt>
                  <dd className="col-span-2 font-medium text-neutral-900 break-words">{renderCell(c, viewing)}</dd>
                </div>
              ))}
            </dl>
            {statusEditable && statusOptions && (
              <div className="flex items-center gap-3 border-t border-neutral-200 pt-4">
                <label htmlFor="status-edit" className="text-sm font-medium text-neutral-700">Change status</label>
                <select
                  id="status-edit"
                  value={viewing.status}
                  onChange={(e) => patch(viewing, { status: e.target.value })}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                >
                  {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
