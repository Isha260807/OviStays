import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Code, FileSpreadsheet, FileText, Download, Loader2 } from "lucide-react"
import StatusBadge from "../ui/StatusBadge.jsx"
import { adminAPI } from "../../services/adminAPI.js"

export const inr = (v) => `₹ ${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const dateLabel = (v) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-")
const dateTimeLabel = (v) => (v ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-")

export const PERIODS = [
  ["", "All Time"], ["today", "Today"], ["week", "This Week"], ["month", "This Month"], ["year", "This Year"], ["custom", "Custom range"],
]

const SELECT = "w-full px-2.5 py-1.5 pr-6 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none cursor-pointer"

// ---- header, cards ------------------------------------------------------------------------------

export function ReportHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

const TONES = {
  green: ["bg-green-100", "text-green-600"], red: ["bg-red-100", "text-red-600"], blue: ["bg-blue-100", "text-blue-600"],
  amber: ["bg-amber-100", "text-amber-600"], violet: ["bg-violet-100", "text-violet-600"], slate: ["bg-slate-200", "text-slate-700"],
}

export function SummaryCard({ label, value, hint, tone = "blue", icon: Icon, onClick }) {
  const [bg, fg] = TONES[tone]
  return (
    <div
      onClick={onClick}
      className={`rounded-lg shadow-sm border border-slate-200 bg-white p-3 flex items-center justify-between gap-3 ${onClick ? "cursor-pointer hover:shadow-md transition-all" : ""}`}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 truncate">{label}</p>
        <p className={`text-xl font-bold mt-0.5 ${fg}`}>{value}</p>
        {hint && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{hint}</p>}
      </div>
      {Icon && (
        <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon className={`w-5 h-5 ${fg}`} />
        </div>
      )}
    </div>
  )
}

// ---- filters ------------------------------------------------------------------------------------

function useOptions(endpoint, enabled) {
  const [options, setOptions] = useState([])
  useEffect(() => {
    if (!enabled) return
    adminAPI.options(endpoint).then(setOptions).catch(() => setOptions([]))
  }, [endpoint, enabled])
  return options
}

// filters: { city, hotel, period, from, to, status, rating }.  show: which of them this report offers.
export function FilterBar({ filters, onChange, onReset, show = ["city", "hotel", "period"], statusOptions, ratingOptions }) {
  const cities = useOptions("locations", show.includes("city"))
  const hotels = useOptions("hotels", show.includes("hotel"))
  const active = ["city", "hotel", "period", "status", "rating"].filter((k) => show.includes(k) && filters[k]).length

  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value, ...(key === "period" && e.target.value !== "custom" ? { from: "", to: "" } : {}) })
  const field = (key, label, items) => (
    <div className="relative flex-1 min-w-[140px]">
      <select value={filters[key] || ""} onChange={set(key)} aria-label={label} className={SELECT}>
        <option value="">{label}</option>
        {items.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
    </div>
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
        {show.includes("city") && field("city", "All Locations", cities.map((o) => [o.value, o.label]))}
        {show.includes("hotel") && field("hotel", "All Hotels", hotels.map((o) => [o.value, o.label]))}
        {show.includes("status") && field("status", "All Statuses", statusOptions.map((s) => [s, s]))}
        {show.includes("rating") && field("rating", "All Ratings", ratingOptions)}
        {show.includes("period") && field("period", "All Time", PERIODS.slice(1))}
        {filters.period === "custom" && (
          <>
            <input type="date" aria-label="From date" value={filters.from || ""} onChange={set("from")} className={`${SELECT} min-w-[130px] flex-1`} />
            <input type="date" aria-label="To date" value={filters.to || ""} onChange={set("to")} className={`${SELECT} min-w-[130px] flex-1`} />
          </>
        )}
        <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white whitespace-nowrap relative">
          Filters
          {active > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full text-[8px] flex items-center justify-center font-bold">{active}</span>}
        </span>
        <button type="button" onClick={onReset} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all whitespace-nowrap">
          Reset
        </button>
      </div>
    </div>
  )
}

// ---- export -------------------------------------------------------------------------------------

export function ExportMenu({ onExport, disabled }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const choose = async (format) => {
    setOpen(false)
    setBusy(true)
    try { await onExport(format) } finally { setBusy(false) }
  }
  const items = [["csv", "Export as CSV", FileText], ["excel", "Export as Excel", FileSpreadsheet], ["pdf", "Export as PDF", FileText], ["json", "Export as JSON", Code]]

  return (
    <div className="relative" ref={ref}>
      <button type="button" disabled={disabled || busy} onClick={() => setOpen((o) => !o)}
        className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-1 transition-all">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        <span>Export</span>
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
          <p className="px-3 py-1.5 text-xs font-semibold text-slate-500">Export Format</p>
          <div className="border-t border-slate-100" />
          {items.map(([format, label, Icon]) => (
            <button key={format} type="button" onClick={() => choose(format)} className="w-full flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Icon className="w-4 h-4 mr-2" /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- table --------------------------------------------------------------------------------------

export function renderCell(col, row) {
  const v = col.render ? col.render(row) : row[col.key]
  if (v === null || v === undefined || v === "") return <span className="text-slate-300">-</span>
  switch (col.type) {
    case "money": return inr(v)
    case "date": return dateLabel(v)
    case "datetime": return dateTimeLabel(v)
    case "percent": return `${Number(v).toFixed(1)}%`
    case "status": return <StatusBadge value={v} />
    case "stars": return Number(v) ? <span className="text-amber-500">{"★".repeat(Math.round(v))}<span className="text-slate-300">{"★".repeat(5 - Math.round(v))}</span> <span className="text-slate-500 text-[10px]">{Number(v).toFixed(1)}</span></span> : <span className="text-slate-300">-</span>
    default: return v
  }
}

export function ReportTable({ columns, rows, page, pages, total, pageSize = 20, onPage, onRowClick, loading, emptyText = "No data found" }) {
  const align = (col) => (["money", "number", "percent"].includes(col.type) ? "text-right" : "text-left")
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-2 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider w-10">SI</th>
              {columns.map((c) => (
                <th key={c.key} className={`px-2 py-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap ${align(c)}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-16 text-center">
                  <p className="text-base font-semibold text-slate-700 mb-1">No Data Found</p>
                  <p className="text-sm text-slate-500">{emptyText}</p>
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={`${row._id || row.hotelId || row.userId || row.name || "row"}-${i}`} onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`hover:bg-slate-50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}>
                <td className="px-2 py-2 text-slate-500">{(page - 1) * pageSize + i + 1}</td>
                {columns.map((c) => (
                  <td key={c.key} className={`px-2 py-2 text-slate-700 max-w-[220px] truncate ${align(c)} ${c.className || ""}`}>{renderCell(c, row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between pt-3 text-xs text-slate-600">
          <span>Page {page} of {pages} · {total} records</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page" className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </>
  )
}
