import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx"
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import {
  Activity, ArrowUpRight, ShoppingBag, CreditCard, Receipt, DollarSign, Building2, UserCheck,
  UserCircle, Clock, CheckCircle, XCircle, CalendarCheck, BedDouble, Sparkles, MessageSquare, RotateCcw,
} from "lucide-react"
import { adminAPI } from "../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"

const INR_SYMBOL = "₹"

function formatCurrency(amount, options = {}) {
  const numericAmount = Number(amount || 0)
  return `${INR_SYMBOL}${numericAmount.toLocaleString("en-IN", options)}`
}

function timeAgo(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return "just now"
  const units = [["d", 86400], ["h", 3600], ["m", 60]]
  for (const [label, size] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`
  }
  return "just now"
}

// Order of statuses shown in the pie and the "states" cards
const STATUS_CARDS = [
  { key: "checkedOut", label: "Completed", color: "#0ea5e9", path: "/admin/bookings/checked-out" },
  { key: "cancelled", label: "Cancelled", color: "#ef4444", path: "/admin/bookings/cancelled" },
  { key: "confirmed", label: "Confirmed", color: "#f59e0b", path: "/admin/bookings/confirmed" },
  { key: "pending", label: "Pending", color: "#10b981", path: "/admin/bookings/pending" },
  { key: "checkedIn", label: "Checked In", color: "#8b5cf6", path: "/admin/bookings/checked-in" },
  { key: "refunded", label: "Refunded", color: "#64748b", path: "/admin/bookings/refunded" },
]

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const selectClass =
  "h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-black/20"

export default function Dashboard() {
  const navigate = useNavigate()
  const [selectedCity, setSelectedCity] = useState("all")
  const [selectedPeriod, setSelectedPeriod] = useState("overall")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [dashboardData, setDashboardData] = useState(null)
  const [cities, setCities] = useState([])

  // City list for the location filter
  useEffect(() => {
    adminAPI.options("locations").then((list) => setCities(Array.isArray(list) ? list : [])).catch(() => setCities([]))
  }, [])

  // Fetch dashboard stats whenever a filter changes
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError("")
    adminAPI
      .getDashboardStats({ period: selectedPeriod, ...(selectedCity !== "all" ? { city: selectedCity } : {}) })
      .then((data) => { if (!cancelled) setDashboardData(data) })
      .catch((err) => { if (!cancelled) { setDashboardData(null); setError(errorMessage(err)) } })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [selectedCity, selectedPeriod])

  const byStatus = dashboardData?.bookings?.byStatus || {}
  const bookingStats = STATUS_CARDS.map((s) => ({ ...s, value: byStatus[s.key] || 0 }))
  const monthlyData = dashboardData?.monthlyData?.length
    ? dashboardData.monthlyData
    : MONTH_NAMES.map((month) => ({ month, revenue: 0, commission: 0, bookings: 0 }))

  const revenueTotal = dashboardData?.revenue?.total || 0
  const commissionTotal = dashboardData?.commission?.total || 0
  const platformFeeTotal = dashboardData?.platformFee?.total || 0
  const gstTotal = dashboardData?.gst?.total || 0
  const refundsTotal = dashboardData?.refunds?.total || 0
  const bookingsTotal = dashboardData?.bookings?.total || 0
  const totalHotels = dashboardData?.hotels?.total || 0
  const pendingHotelRequests = dashboardData?.hotels?.pendingRequests || 0
  const totalRoomTypes = dashboardData?.roomTypes?.total || 0
  const totalAmenities = dashboardData?.amenities?.total || 0
  const totalCustomers = dashboardData?.customers?.total || 0
  const openTickets = dashboardData?.tickets?.open || 0

  const pieData = bookingStats.map((item) => ({ name: item.label, value: item.value, fill: item.color }))
  const platformTotal = Number(commissionTotal) + Number(platformFeeTotal) + Number(gstTotal)
  const periodLabel =
    selectedPeriod === "overall" ? "Overall" : selectedPeriod === "today" ? "Today's" : `This ${selectedPeriod}'s`

  const activityFeed = dashboardData?.liveSignals || []
  const totalRevenueHelper = [
    `Comm: ${formatCurrency(commissionTotal)}`,
    `Platform: ${formatCurrency(platformFeeTotal)}`,
    `GST: ${formatCurrency(gstTotal)}`,
  ].join(" + ")

  return (
    <div className="px-4 pb-10 lg:px-6 pt-4">
      <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_30px_120px_-60px_rgba(0,0,0,0.28)]">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm text-neutral-700 ring-1 ring-neutral-200">
              <span className="h-3 w-3 animate-ping rounded-full bg-neutral-800/70" />
              Updating metrics...
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 border-b border-neutral-200 bg-linear-to-br from-white via-neutral-50 to-neutral-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Admin Overview</p>
              <h1 className="text-2xl font-semibold text-neutral-900">Operations Command</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className={`${selectClass} min-w-[160px]`} aria-label="Location">
              <option value="all">All locations</option>
              {cities.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className={`${selectClass} min-w-[140px]`} aria-label="Period">
              <option value="overall">Overall</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
            </select>
          </div>
        </div>

        <div className="space-y-8 px-6 py-6">
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Could not load dashboard data: {error}
            </div>
          )}

          {/* Financial Overview (6 cards in balanced 3x2 grid) */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold tracking-wide uppercase text-neutral-500">Financial Overview</h3>
              <p className="text-xs text-neutral-400">Revenue, commissions, fees and total platform earnings</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard title="Gross revenue" value={formatCurrency(revenueTotal)} helper={`${periodLabel} booking volume`}
                icon={<ShoppingBag className="h-5 w-5 text-emerald-600" />} accent="bg-emerald-200/40" path="/admin/payments" />
              <MetricCard title="Commission earned" value={formatCurrency(commissionTotal)} helper={`${periodLabel} hotel cut`}
                icon={<ArrowUpRight className="h-5 w-5 text-indigo-600" />} accent="bg-indigo-200/40" path="/admin/reports/admin-earnings" />
              <MetricCard title="Platform fee" value={formatCurrency(platformFeeTotal)} helper={`Platform service fees: ${periodLabel}`}
                icon={<CreditCard className="h-5 w-5 text-red-600" />} accent="bg-red-200/40" path="/admin/settings" />
              <MetricCard title="GST" value={formatCurrency(gstTotal)} helper={`Total tax collected: ${periodLabel}`}
                icon={<Receipt className="h-5 w-5 text-orange-600" />} accent="bg-orange-200/40" path="/admin/reports/tax" />
              <MetricCard title="Refunds" value={formatCurrency(refundsTotal)} helper={`Refunded bookings: ${periodLabel}`}
                icon={<RotateCcw className="h-5 w-5 text-blue-600" />} accent="bg-blue-200/40" path="/admin/bookings/refunded" />
              <MetricCard title="Platform Total" value={formatCurrency(platformTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} helper={totalRevenueHelper}
                icon={<DollarSign className="h-5 w-5 text-emerald-600" />} accent="bg-emerald-200/50 border border-emerald-300/50" path="/admin/reports/admin-earnings" />
            </div>
          </div>

          {/* Operations & Platform Metrics (10 cards in balanced 5x2 grid) */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold tracking-wide uppercase text-neutral-500">Platform & Operations</h3>
              <p className="text-xs text-neutral-400">Booking pipeline, hotels, inventory, and customers</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              <MetricCard title="Pending" value={(byStatus.pending || 0).toLocaleString("en-IN")} helper="Awaiting confirmation"
                icon={<Clock className="h-5 w-5 text-red-600" />} accent="bg-red-200/40" path="/admin/bookings/pending" />
              <MetricCard title="Confirmed" value={(byStatus.confirmed || 0).toLocaleString("en-IN")} helper="Upcoming stays"
                icon={<CalendarCheck className="h-5 w-5 text-amber-600" />} accent="bg-amber-200/40" path="/admin/bookings/confirmed" />
              <MetricCard title="Checked in" value={(byStatus.checkedIn || 0).toLocaleString("en-IN")} helper="Guests currently staying"
                icon={<Activity className="h-5 w-5 text-violet-600" />} accent="bg-violet-200/40" path="/admin/bookings/checked-in" />
              <MetricCard title="Completed" value={(byStatus.checkedOut || 0).toLocaleString("en-IN")} helper="Successfully checked out"
                icon={<CheckCircle className="h-5 w-5 text-emerald-600" />} accent="bg-emerald-200/40" path="/admin/bookings/checked-out" />
              <MetricCard title="Hotels" value={totalHotels.toLocaleString("en-IN")} helper="Active hotels"
                icon={<Building2 className="h-5 w-5 text-blue-600" />} accent="bg-blue-200/40" path="/admin/hotels/all" />
              <MetricCard title="Hotel requests" value={pendingHotelRequests.toLocaleString("en-IN")} helper="Awaiting approval"
                icon={<UserCheck className="h-5 w-5 text-orange-600" />} accent="bg-orange-200/40" path="/admin/hotels/join-requests" />
              <MetricCard title="Room types" value={totalRoomTypes.toLocaleString("en-IN")} helper="Across all hotels"
                icon={<BedDouble className="h-5 w-5 text-indigo-600" />} accent="bg-indigo-200/40" path="/admin/rooms/types" />
              <MetricCard title="Amenities" value={totalAmenities.toLocaleString("en-IN")} helper="Available facilities"
                icon={<Sparkles className="h-5 w-5 text-pink-600" />} accent="bg-pink-200/40" path="/admin/rooms/amenities" />
              <MetricCard title="Customers" value={totalCustomers.toLocaleString("en-IN")} helper="Registered users"
                icon={<UserCircle className="h-5 w-5 text-cyan-600" />} accent="bg-cyan-200/40" path="/admin/customers" />
              <MetricCard title="Open tickets" value={openTickets.toLocaleString("en-IN")} helper="Need a response"
                icon={<MessageSquare className="h-5 w-5 text-yellow-600" />} accent="bg-yellow-200/40" path="/admin/support-tickets" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 min-w-0 border-neutral-200 bg-white">
              <CardHeader className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Revenue trajectory</CardTitle>
                <p className="text-sm text-neutral-500">Commission and gross revenue with monthly booking volume ({new Date().getFullYear()})</p>
              </CardHeader>
              <CardContent className="min-w-0 pt-4">
                <div className="h-80 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <ComposedChart data={monthlyData}>
                      <defs>
                        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="comFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f25f5a" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f25f5a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12 }} labelStyle={{ color: "#111827" }} itemStyle={{ color: "#111827" }} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" fillOpacity={1} fill="url(#revFill)" name="Gross revenue" />
                      <Area type="monotone" dataKey="commission" stroke="#f25f5a" fillOpacity={1} fill="url(#comFill)" name="Commission" />
                      <Bar dataKey="bookings" fill="#ef4444" radius={[6, 6, 0, 0]} name="Bookings" barSize={10} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0 border-neutral-200 bg-white">
              <CardHeader className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <div>
                  <CardTitle className="text-lg text-neutral-900">Booking mix</CardTitle>
                  <p className="text-sm text-neutral-500">Distribution by state</p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">{bookingsTotal} bookings</span>
              </CardHeader>
              <CardContent className="min-w-0 pt-4">
                <div className="h-72 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                        {pieData.map((entry, index) => <Cell key={index} fill={entry.fill} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12 }} labelStyle={{ color: "#111827" }} itemStyle={{ color: "#111827" }} />
                      <Legend formatter={(value) => <span style={{ color: "#111827", fontSize: 12 }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {bookingStats.map((item) => (
                    <div
                      key={item.key}
                      onClick={() => navigate(item.path)}
                      className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 cursor-pointer hover:bg-neutral-50 hover:border-neutral-300 transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full transition-transform group-hover:scale-125" style={{ background: item.color }} />
                        <p className="text-sm text-neutral-800 group-hover:text-neutral-900">{item.label}</p>
                      </div>
                      <p className="text-sm font-semibold text-neutral-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="min-w-0 border-neutral-200 bg-white">
              <CardHeader className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Momentum snapshot</CardTitle>
                <span className="text-xs text-neutral-500">Summary: {bookingsTotal} Bookings</span>
              </CardHeader>
              <CardContent className="min-w-0 pt-4">
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={monthlyData.slice(-6)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12 }} labelStyle={{ color: "#111827" }} itemStyle={{ color: "#111827" }} />
                      <Legend />
                      <Bar dataKey="bookings" fill="#0ea5e9" radius={[8, 8, 0, 0]} name="Bookings" />
                      <Bar dataKey="commission" fill="#f25f5a" radius={[8, 8, 0, 0]} name="Commission" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-white">
              <CardHeader className="border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Live signals</CardTitle>
                <p className="text-sm text-neutral-500">Latest bookings, hotels and sign-ups</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 h-[300px] overflow-y-auto custom-scrollbar">
                {activityFeed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-neutral-400">
                    <Activity className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm">No recent signals</p>
                  </div>
                ) : (
                  activityFeed.map((item, idx) => <Signal key={idx} item={item} />)
                )}
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-white">
              <CardHeader className="border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Booking states</CardTitle>
                <p className="text-sm text-neutral-500">Quick glance by status</p>
              </CardHeader>
              <CardContent className="grid gap-3 pt-4">
                {bookingStats.map((item) => (
                  <div
                    key={item.key}
                    onClick={() => navigate(item.path)}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 cursor-pointer hover:bg-neutral-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-transform group-hover:scale-110"
                        style={{ background: `${item.color}1A`, color: item.color }}
                      >
                        {item.label.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm text-neutral-900 group-hover:font-medium">{item.label}</p>
                        <p className="text-xs text-neutral-500">Tracked in {selectedPeriod}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-neutral-900">{item.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

const SIGNAL_STYLES = {
  booking_pending: { icon: <Clock className="h-4 w-4 text-amber-600" />, bg: "bg-amber-50" },
  booking_completed: { icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, bg: "bg-emerald-50" },
  booking_cancelled: { icon: <XCircle className="h-4 w-4 text-red-600" />, bg: "bg-red-50" },
  booking_other: { icon: <CalendarCheck className="h-4 w-4 text-indigo-600" />, bg: "bg-indigo-50" },
  hotel: { icon: <Building2 className="h-4 w-4 text-blue-600" />, bg: "bg-blue-50" },
  customer: { icon: <UserCircle className="h-4 w-4 text-pink-600" />, bg: "bg-pink-50" },
}

function Signal({ item }) {
  const style = SIGNAL_STYLES[item.type] || { icon: <Activity className="h-4 w-4 text-neutral-600" />, bg: "bg-neutral-50" }
  return (
    <div className={`flex items-start gap-3 rounded-xl border border-neutral-200 ${style.bg} px-3 py-3 hover:border-neutral-300 transition-all`}>
      <div className="mt-0.5">{style.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-neutral-900 truncate">{item.title}</p>
          <span className="text-[10px] text-neutral-400 whitespace-nowrap">{timeAgo(item.at)}</span>
        </div>
        <p className="text-xs text-neutral-600 line-clamp-1">{item.detail}</p>
      </div>
    </div>
  )
}

function MetricCard({ title, value, helper, icon, accent, path }) {
  const navigate = useNavigate()
  return (
    <Card
      className="group relative overflow-hidden border-neutral-200 bg-white p-0 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
      onClick={() => path && navigate(path)}
    >
      <CardContent className="relative flex flex-col gap-2 px-4 pb-4 pt-4 h-full">
        <div className={`absolute inset-0 opacity-40 transition-opacity duration-300 group-hover:opacity-60 ${accent}`} />
        <div className="relative flex items-center justify-between z-10">
          <div className="flex-1 min-w-0 mr-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-bold mb-1 truncate">{title}</p>
            <p className="text-xl font-bold text-neutral-900 leading-tight mb-1">{value}</p>
            <p className="text-[10px] text-neutral-500 font-medium line-clamp-1">{helper}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 ring-1 ring-neutral-200 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-md">
            {icon}
          </div>
        </div>
        <div className="absolute bottom-2 right-2 opacity-0 transform translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
          <ArrowUpRight className="h-3 w-3 text-neutral-400" />
        </div>
      </CardContent>
    </Card>
  )
}
