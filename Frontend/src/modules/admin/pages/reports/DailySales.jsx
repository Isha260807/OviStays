import { useCallback, useEffect, useMemo, useState } from "react"
import { Banknote, CalendarCheck, ChevronLeft, ChevronRight, ClipboardList, DollarSign, Loader2, Receipt, Search, TrendingUp, Wallet } from "lucide-react"
import { toast } from "sonner"
import { adminAPI } from "../../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"
import { exportRows } from "@/shared/utils/exportUtils.js"
import { ExportMenu, ReportHeader, ReportTable, SummaryCard, inr } from "../../components/reports/ReportParts.jsx"
import { exportColumns } from "../../components/reports/ReportPage.jsx"

const col = (key, label, type, extra) => ({ key, label, type, ...extra })

const TABS = {
  bookings: {
    label: "Bookings",
    columns: [
      col("refId", "Booking ID"), col("guestName", "Guest"), col("hotelName", "Hotel"), col("amount", "Amount", "money"),
      col("status", "Status", "status"), col("paymentMethod", "Method"), col("paymentStatus", "Payment", "status"),
    ],
    search: ["refId", "guestName", "hotelName"],
  },
  hotels: {
    label: "Hotels",
    columns: [
      col("hotelName", "Hotel"), col("city", "City"), col("bookings", "Bookings", "number"), col("gross", "Booking Value", "money"),
      col("onlineCollected", "Online Collected", "money"), col("cashCollected", "Cash at Hotel", "money"), col("platformShareOnCash", "Platform Share to Collect", "money"),
    ],
    search: ["hotelName", "city"],
  },
  methods: {
    label: "Payment Methods",
    columns: [
      col("method", "Method"), col("paidCount", "Payments", "number"), col("paid", "Collected", "money"), col("pending", "Pending", "money"),
      col("failed", "Failed", "money"), col("refunded", "Refunded", "money"),
    ],
    search: ["method"],
  },
}

// Dates are handled as YYYY-MM-DD strings in local time (the same day the server reads)
const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const shift = (dateStr, days) => { const d = new Date(`${dateStr}T00:00:00`); d.setDate(d.getDate() + days); return toDateStr(d) }

export default function DailySales() {
  const today = toDateStr(new Date())
  const [date, setDate] = useState(today)
  const [tab, setTab] = useState("bookings")
  const [search, setSearch] = useState("")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setData(await adminAPI.report("daily-sales", { date }))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { load() }, [load])

  const view = TABS[tab]
  const rows = useMemo(() => {
    const all = data ? { bookings: data.bookings, hotels: data.hotels, methods: data.methods }[tab] : []
    const q = search.trim().toLowerCase()
    return q ? all.filter((r) => view.search.some((f) => String(r[f] ?? "").toLowerCase().includes(q))) : all
  }, [data, tab, search, view])

  const handleExport = async (format) => {
    if (!rows.length) return toast.error("No data to export")
    await exportRows(format, rows, exportColumns(view.columns), `daily_${tab}_${date}`, `Daily Sales ${date} - ${view.label}`)
  }

  const s = data?.summary

  return (
    <div className="p-2 lg:p-3 bg-slate-50 min-h-full">
      <div className="w-full mx-auto">
        <ReportHeader icon={Receipt} title="Daily Sales & Cash Audit" subtitle="Everything that was booked and collected on one day">
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Previous day" onClick={() => setDate(shift(date, -1))} className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
            <input type="date" aria-label="Report date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="button" aria-label="Next day" disabled={date >= today} onClick={() => setDate(shift(date, 1))} className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            <button type="button" onClick={() => setDate(today)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50">Today</button>
            <button type="button" onClick={() => setDate(shift(today, -1))} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50">Yesterday</button>
          </div>
        </ReportHeader>

        {error && (
          <div role="alert" className="mb-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span><button onClick={load} className="font-semibold underline">Retry</button>
          </div>
        )}

        {!data && loading ? (
          <div className="py-24 flex flex-col items-center gap-3 text-slate-500"><Loader2 className="w-7 h-7 animate-spin text-blue-600" /> Loading daily sales...</div>
        ) : data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-3">
              <SummaryCard label="Bookings" value={s.bookings.toLocaleString("en-IN")} tone="blue" icon={ClipboardList} />
              <SummaryCard label="Booking Value" value={inr(s.grossValue)} hint="Confirmed, checked in and checked out" tone="green" icon={DollarSign} />
              <SummaryCard label="Admin Earning" value={inr(s.adminEarning)} hint={`Commission ${inr(s.commission)} · fee ${inr(s.platformFee)} · GST ${inr(s.gst)}`} tone="violet" icon={TrendingUp} />
              <SummaryCard label="Collected" value={inr(s.collected)} hint="Payments marked paid" tone="green" icon={Wallet} />
              <SummaryCard label="Pending Payments" value={inr(s.pending)} tone="amber" icon={CalendarCheck} />
              <SummaryCard label="Refunded" value={inr(s.refunded)} tone="red" icon={Receipt} />
            </div>

            {/* The cash audit: money taken at the hotel desk that the platform's share is still owed from */}
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-amber-100 flex items-center justify-center"><Banknote className="w-6 h-6 text-amber-700" /></div>
                <div>
                  <p className="text-sm font-bold text-amber-900">Cash collected at hotels: {inr(s.cashCollected)}</p>
                  <p className="text-[11px] font-semibold text-amber-700">Paid in cash at the hotel desk, so the hotel is holding it</p>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] font-bold uppercase text-amber-800">Platform share to collect from hotels</p>
                <p className="text-xl font-black text-amber-900">{inr(s.platformShareOnCash)}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {Object.entries(TABS).map(([key, t]) => (
                    <button key={key} type="button" onClick={() => { setTab(key); setSearch("") }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${tab === key ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                      {t.label} ({data[key].length})
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input type="text" aria-label="Search" placeholder={`Search ${view.label.toLowerCase()}`} value={search} onChange={(e) => setSearch(e.target.value)}
                      className="pl-7 pr-2 py-1.5 w-full text-[11px] rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <ExportMenu onExport={handleExport} disabled={!rows.length} />
                </div>
              </div>
              <ReportTable columns={view.columns} rows={rows} page={1} pages={1} total={rows.length} pageSize={rows.length || 1} loading={loading} emptyText={`No ${view.label.toLowerCase()} on this day`} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
