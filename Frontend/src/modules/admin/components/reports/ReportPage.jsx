import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { adminAPI } from "../../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"
import { exportRows } from "@/shared/utils/exportUtils.js"
import Modal from "../ui/Modal.jsx"
import { ExportMenu, FilterBar, ReportHeader, ReportTable, SummaryCard } from "./ReportParts.jsx"

const PAGE_SIZE = 20
const EXPORT_LIMIT = 5000

// A custom date range is sent as from/to; the other periods are sent by name.
export function toParams(filters, search) {
  const params = { ...filters }
  if (params.period === "custom") delete params.period
  for (const key of Object.keys(params)) if (!params[key]) delete params[key]
  if (search.trim()) params.search = search.trim()
  return params
}

// What a column writes into an export: plain numbers and ISO dates, not "₹ 1,200.00"
const exportValue = (col, row) => {
  const v = col.render ? col.render(row) : row[col.key]
  if (v === null || v === undefined) return ""
  if (col.type === "date" || col.type === "datetime") return new Date(v).toISOString().slice(0, col.type === "date" ? 10 : 19).replace("T", " ")
  return v
}
export const exportColumns = (columns) => columns.map((c) => ({ key: c.key, label: c.label, export: (row) => exportValue(c, row) }))

/**
 * One screen for the standard report layout: filters, summary cards, table, search and export.
 *
 * config: { title, subtitle, icon, endpoint, exportName, show[], statusOptions, ratingOptions,
 *           searchPlaceholder, cards(summary, data, navigate), columns[], extra?(data),
 *           detail?: { title(row), endpoint(row), columns[] }, actions?: [{ label, tone, run(row) }] }
 */
export default function ReportPage({ config }) {
  const { title, subtitle, icon, endpoint, exportName, show, statusOptions, ratingOptions, searchPlaceholder, cards, summaryView, columns, extra, detail, actions } = config
  const navigate = useNavigate()
  const [filters, setFilters] = useState({})
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [open, setOpen] = useState(null) // row whose detail is shown
  // Same object between renders, so the detail table does not reload on every keystroke elsewhere
  const detailFilters = useMemo(() => toParams(filters, ""), [filters])

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setData(await adminAPI.report(endpoint, { ...toParams(filters, debounced), page, limit: PAGE_SIZE }))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [endpoint, filters, debounced, page])

  useEffect(() => { load() }, [load])

  const changeFilters = (next) => { setFilters(next); setPage(1) }
  const reset = () => { setFilters({}); setSearch(""); setPage(1) }

  const allColumns = useMemo(() => {
    if (!actions) return columns
    return [...columns, {
      key: "__actions", label: "Action",
      render: (row) => (
        <span className="inline-flex gap-1">
          {actions.map((a) => (
            <button key={a.label} type="button" onClick={(e) => { e.stopPropagation(); a.run(row, load) }}
              className="rounded-md border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50">{a.label}</button>
          ))}
        </span>
      ),
    }]
  }, [columns, actions, load])

  // Exports everything that matches the filters, not just the page on screen
  const handleExport = async (format) => {
    try {
      const all = await adminAPI.report(endpoint, { ...toParams(filters, debounced), page: 1, limit: EXPORT_LIMIT })
      if (!all.items.length) return toast.error("No data to export")
      await exportRows(format, all.items, exportColumns(columns), exportName, title)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="p-2 lg:p-3 bg-slate-50 min-h-full">
      <div className="w-full mx-auto">
        <ReportHeader icon={icon} title={title} subtitle={subtitle} />
        <FilterBar filters={filters} onChange={changeFilters} onReset={reset} show={show} statusOptions={statusOptions} ratingOptions={ratingOptions} />

        {error && (
          <div role="alert" className="mb-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={load} className="font-semibold underline">Retry</button>
          </div>
        )}

        {data && summaryView && summaryView(data.summary, navigate)}

        {data && cards && !summaryView && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${cards(data.summary, data, navigate).length > 3 ? "xl:grid-cols-4" : "xl:grid-cols-3"} gap-3 mb-3`}>
            {cards(data.summary, data, navigate).map((c) => <SummaryCard key={c.label} {...c} />)}
          </div>
        )}

        {data && extra?.(data)}

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h2 className="text-base font-bold text-slate-900">{title} <span className="text-slate-400 font-medium">({data?.total ?? 0})</span></h2>
            <div className="flex items-center gap-2">
              {searchPlaceholder && (
                <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <input type="text" placeholder={searchPlaceholder} aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)}
                    className="pl-7 pr-7 py-1.5 w-full text-[11px] rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  {loading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 animate-spin" />}
                </div>
              )}
              <ExportMenu onExport={handleExport} disabled={!data?.total} />
            </div>
          </div>

          {!data && loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-500"><Loader2 className="w-7 h-7 animate-spin text-blue-600" /> Loading {title.toLowerCase()}...</div>
          ) : (
            <ReportTable columns={allColumns} rows={data?.items || []} page={page} pages={data?.pages || 1} total={data?.total || 0}
              pageSize={PAGE_SIZE} onPage={setPage} loading={loading} onRowClick={detail ? setOpen : undefined} />
          )}
        </div>
      </div>

      {detail && (
        <Modal open={!!open} title={open ? detail.title(open) : ""} onClose={() => setOpen(null)} wide>
          {open && <DetailTable detail={detail} row={open} filters={detailFilters} />}
        </Modal>
      )}
    </div>
  )
}

// The rows behind one line of a report (for example the bookings behind one hotel's tax figure)
function DetailTable({ detail, row, filters }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    setError("")
    adminAPI.report(detail.endpoint(row), { ...filters, page, limit: 10 })
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(errorMessage(err)))
    return () => { cancelled = true }
  }, [detail, row, filters, page])

  if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>
  if (!data) return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
  return <ReportTable columns={detail.columns} rows={data.items} page={page} pages={data.pages} total={data.total} pageSize={10} onPage={setPage} />
}
