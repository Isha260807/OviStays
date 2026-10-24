import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import {
  Building2, CalendarCheck, ClipboardList, DollarSign, FileText, MessageSquare, Receipt, Star, TrendingUp, Users, Wallet, XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { adminAPI } from "../../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"
import { inr } from "../../components/reports/ReportParts.jsx"

const BOOKING_STATUSES = ["Pending", "Confirmed", "Checked In", "Checked Out", "Cancelled", "Refunded"]
const col = (key, label, type, extra) => ({ key, label, type, ...extra })

const bookingColumns = [
  col("refId", "Booking ID"), col("guestName", "Guest"), col("hotelName", "Hotel"), col("city", "City"),
  col("checkIn", "Check-in", "date"), col("checkOut", "Check-out", "date"), col("amount", "Amount", "money"),
  col("status", "Status", "status"), col("createdAt", "Booked on", "date"),
]

const ratingOptions = [[5, "5 stars"], [4, "4 stars"], [3, "3 stars"], [2, "2 stars"], [1, "1 star"]]

// Configs for the standard report layout (see ReportPage). Paths are under /admin/reports.
// Two columns, like Grhapoch's transaction report: the big totals on the left, earnings on the right
function transactionSummary(s, navigate) {
  const big = (label, value, count, tone, Icon) => (
    <div className="rounded-lg shadow-sm border border-slate-200 p-4 bg-slate-100">
      <div className="mb-3 flex justify-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${tone === "green" ? "bg-green-100" : "bg-red-100"}`}>
          <Icon className={`w-8 h-8 ${tone === "green" ? "text-green-600" : "text-red-600"}`} />
        </div>
      </div>
      <div className="text-center">
        <p className={`text-xl font-bold mb-1 ${tone === "green" ? "text-green-600" : "text-red-600"}`}>{value}</p>
        <p className="text-sm text-slate-600 leading-tight">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{count.toLocaleString("en-IN")} transactions</p>
      </div>
    </div>
  )
  const small = (label, value, tone, Icon, onClick) => (
    <div onClick={onClick} className={`rounded-lg shadow-sm border border-slate-200 p-3 bg-slate-100 ${onClick ? "cursor-pointer hover:shadow-md transition-all" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}><Icon className="w-5 h-5 text-slate-700" /></div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
        </div>
        <p className="text-base font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
      <div className="space-y-3">
        {big("Completed Transaction", inr(s.completedTransaction), s.completedCount, "green", DollarSign)}
        {big("Refunded Transaction", inr(s.refundedTransaction), s.refundedCount, "red", XCircle)}
      </div>
      <div className="space-y-3">
        {small("Admin Earning", inr(s.adminEarning), "bg-green-100", TrendingUp, () => navigate("/admin/reports/admin-earnings"))}
        {small("Hotel Earning", inr(s.hotelEarning), "bg-blue-100", Building2)}
        {small(`Pending (${s.pendingCount})`, inr(s.pendingTransaction), "bg-amber-100", CalendarCheck)}
        {small(`Failed (${s.failedCount})`, inr(s.failedTransaction), "bg-red-100", XCircle)}
      </div>
    </div>
  )
}

export const reportConfigs = {
  transactions: {
    title: "Transaction Report", subtitle: "Every payment with the platform's and the hotel's share", icon: FileText,
    endpoint: "transactions", exportName: "transaction_report", show: ["city", "hotel", "status", "period"], statusOptions: ["Paid", "Pending", "Failed", "Refunded"],
    searchPlaceholder: "Search by Booking ID or guest", summaryView: transactionSummary,
    columns: [
      col("bookingCode", "Booking ID"), col("hotelName", "Hotel"), col("guestName", "Guest"), col("method", "Method"), col("itemAmount", "Booking Amount", "money"),
      col("gst", "GST", "money"), col("platformFee", "Platform Fee", "money"), col("commission", "Commission", "money"), col("hotelEarning", "Hotel Earning", "money"),
      col("amount", "Paid", "money"), col("status", "Status", "status"), col("createdAt", "Date", "date"),
    ],
  },

  bookings: {
    title: "Booking Report", subtitle: "Every booking with its status and value", icon: ClipboardList,
    endpoint: "bookings", exportName: "booking_report", show: ["city", "hotel", "status", "period"], statusOptions: BOOKING_STATUSES,
    searchPlaceholder: "Search by booking ID, guest or hotel",
    cards: (s) => [
      { label: "Total Bookings", value: s.total.toLocaleString("en-IN"), tone: "blue", icon: ClipboardList },
      { label: "Gross Value", value: inr(s.grossValue), hint: "Confirmed, checked in and checked out", tone: "green", icon: DollarSign },
      { label: "Average Booking", value: inr(s.averageValue), tone: "violet", icon: TrendingUp },
      { label: "Pending", value: (s.byStatus.Pending || 0).toLocaleString("en-IN"), hint: "Waiting for confirmation", tone: "amber", icon: CalendarCheck },
    ],
    columns: bookingColumns,
  },

  tax: {
    title: "Tax Report", subtitle: "GST collected on bookings, hotel by hotel. Click a row to see its bookings", icon: Receipt,
    endpoint: "tax", exportName: "tax_report", show: ["city", "hotel", "period"], searchPlaceholder: "Search by hotel name",
    cards: (s) => [
      { label: "Total Income", value: inr(s.totalIncome), hint: "Commission + platform fees", tone: "blue", icon: DollarSign },
      { label: "Total Tax (GST)", value: inr(s.totalTax), tone: "red", icon: FileText },
      { label: "Taxable Value", value: inr(s.taxableValue), tone: "green", icon: Wallet },
      { label: "Bookings", value: s.bookings.toLocaleString("en-IN"), tone: "slate", icon: ClipboardList },
    ],
    columns: [
      col("hotelName", "Hotel"), col("city", "City"), col("bookings", "Bookings", "number"), col("taxableValue", "Taxable Value", "money"),
      col("commission", "Commission", "money"), col("platformFee", "Platform Fee", "money"), col("income", "Total Income", "money"), col("gst", "GST", "money"),
    ],
    detail: {
      title: (row) => `GST on bookings - ${row.hotelName}`,
      endpoint: (row) => `tax/${row.hotelId}`,
      columns: [
        col("refId", "Booking ID"), col("guestName", "Guest"), col("createdAt", "Booked on", "date"), col("amount", "Amount", "money"),
        col("commission", "Commission", "money"), col("platformFee", "Platform Fee", "money"), col("gst", "GST", "money"), col("status", "Status", "status"),
      ],
    },
  },

  "admin-earnings": {
    title: "Admin Earning Report", subtitle: "What the platform earns: commission, platform fees and GST", icon: TrendingUp,
    endpoint: "admin-earnings", exportName: "admin_earning_report", show: ["city", "hotel", "period"], searchPlaceholder: "Search by booking ID, hotel or guest",
    cards: (s) => [
      { label: "Total Admin Earning", value: inr(s.total), tone: "green", icon: DollarSign },
      { label: "Commission", value: inr(s.commission), tone: "blue", icon: TrendingUp },
      { label: "Platform Fee", value: inr(s.platformFee), tone: "violet", icon: Wallet },
      { label: "GST Collected", value: inr(s.gst), tone: "amber", icon: Receipt },
    ],
    extra: (data) => (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
        <h2 className="text-sm font-bold text-slate-900 mb-2">Earnings by {data.groupedBy}</h2>
        {data.series.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No earnings in this period</p>
        ) : (
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }} />
                <Legend />
                <Bar dataKey="commission" stackId="e" name="Commission" fill="#0ea5e9" />
                <Bar dataKey="platformFee" stackId="e" name="Platform fee" fill="#8b5cf6" />
                <Bar dataKey="gst" stackId="e" name="GST" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    ),
    columns: [
      col("refId", "Booking ID"), col("hotelName", "Hotel"), col("guestName", "Guest"), col("createdAt", "Booked on", "date"), col("amount", "Booking Amount", "money"),
      col("commission", "Commission", "money"), col("platformFee", "Platform Fee", "money"), col("gst", "GST", "money"), col("adminEarning", "Admin Earning", "money"),
    ],
  },

  cancellations: {
    title: "Cancellation & Refund Report", subtitle: "Cancelled and refunded bookings and the revenue lost", icon: XCircle,
    endpoint: "cancellations", exportName: "cancellation_report", show: ["city", "hotel", "status", "period"], statusOptions: ["Cancelled", "Refunded"],
    searchPlaceholder: "Search by booking ID, guest or hotel",
    cards: (s) => [
      { label: "Cancelled", value: s.cancelled.toLocaleString("en-IN"), hint: inr(s.lostValue), tone: "red", icon: XCircle },
      { label: "Refunded", value: s.refunded.toLocaleString("en-IN"), hint: inr(s.refundedValue), tone: "amber", icon: Wallet },
      { label: "Cancellation Rate", value: `${s.cancellationRate.toFixed(1)}%`, hint: `of ${s.totalBookings.toLocaleString("en-IN")} bookings`, tone: "violet", icon: TrendingUp },
      { label: "Lost Revenue", value: inr(s.lostValue + s.refundedValue), tone: "slate", icon: DollarSign },
    ],
    extra: (data) => data.byHotel.length > 0 && (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
        <h2 className="text-sm font-bold text-slate-900 mb-2">Hotels with the most cancellations</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {data.byHotel.slice(0, 5).map((h) => (
            <div key={h.hotelId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold text-slate-800 truncate">{h.hotelName}</p>
              <p className="text-[11px] text-slate-500">{h.count} cancelled · {inr(h.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    columns: [
      col("refId", "Booking ID"), col("guestName", "Guest"), col("hotelName", "Hotel"), col("city", "City"), col("checkIn", "Check-in", "date"),
      col("amount", "Amount", "money"), col("status", "Status", "status"), col("createdAt", "Booked on", "date"),
    ],
  },

  hotels: {
    title: "Hotel Report", subtitle: "How each hotel is performing", icon: Building2,
    endpoint: "hotels", exportName: "hotel_report", show: ["city", "hotel", "period"], searchPlaceholder: "Search by hotel, city or owner",
    cards: (s) => [
      { label: "Hotels", value: s.hotels.toLocaleString("en-IN"), hint: `${s.activeHotels} with bookings`, tone: "blue", icon: Building2 },
      { label: "Bookings", value: s.bookings.toLocaleString("en-IN"), tone: "violet", icon: ClipboardList },
      { label: "Revenue", value: inr(s.revenue), tone: "green", icon: DollarSign },
      { label: "Commission", value: inr(s.commission), tone: "amber", icon: TrendingUp },
    ],
    columns: [
      col("hotelName", "Hotel"), col("city", "City"), col("status", "Status", "status"), col("bookings", "Bookings", "number"), col("completed", "Completed", "number"),
      col("cancelled", "Cancelled", "number"), col("cancellationRate", "Cancel Rate", "percent"), col("revenue", "Revenue", "money"), col("commission", "Commission", "money"),
      col("averageValue", "Avg Booking", "money"), col("rating", "Rating", "stars"), col("reviews", "Reviews", "number"),
    ],
  },

  "hotel-payouts": {
    title: "Hotel Payout Report", subtitle: "What each hotel has earned, been paid and is still owed", icon: Wallet,
    endpoint: "hotel-payouts", exportName: "hotel_payout_report", show: ["city", "hotel", "period"], searchPlaceholder: "Search by hotel, city or owner",
    cards: (s) => [
      { label: "Hotel Earnings", value: inr(s.earned), hint: "Booking value minus commission", tone: "blue", icon: DollarSign },
      { label: "Paid Out", value: inr(s.paidOut), tone: "green", icon: Wallet },
      { label: "Payouts Pending", value: inr(s.pendingPayout), hint: "Created, not yet processed", tone: "amber", icon: CalendarCheck },
      { label: "Balance Due", value: inr(s.balanceDue), hint: "Earned minus paid out", tone: "red", icon: TrendingUp },
    ],
    columns: [
      col("hotelName", "Hotel"), col("city", "City"), col("owner", "Owner"), col("earned", "Earnings", "money"),
      col("paidOut", "Paid Out", "money"), col("pendingPayout", "Pending Payout", "money"), col("balanceDue", "Balance Due", "money"),
    ],
  },

  customers: {
    title: "Top Customers", subtitle: "Guests ranked by how much they have spent", icon: Users,
    endpoint: "customers", exportName: "top_customers_report", show: ["city", "period"], searchPlaceholder: "Search by guest name",
    cards: (s) => [
      { label: "Customers", value: s.customers.toLocaleString("en-IN"), tone: "blue", icon: Users },
      { label: "Bookings", value: s.bookings.toLocaleString("en-IN"), tone: "violet", icon: ClipboardList },
      { label: "Total Spend", value: inr(s.spent), tone: "green", icon: DollarSign },
      { label: "Average Spend", value: inr(s.averageSpend), tone: "amber", icon: TrendingUp },
    ],
    columns: [
      col("name", "Guest"), col("email", "Email"), col("phone", "Phone"), col("bookings", "Bookings", "number"), col("completed", "Completed", "number"),
      col("cancelled", "Cancelled", "number"), col("spent", "Total Spent", "money"), col("lastBooking", "Last Booking", "date"),
    ],
  },

  feedback: {
    title: "Guest Feedback", subtitle: "Reviews and ratings left by guests", icon: MessageSquare,
    endpoint: "feedback", exportName: "guest_feedback_report", show: ["hotel", "rating", "status", "period"], ratingOptions, statusOptions: ["Published", "Pending", "Hidden"],
    searchPlaceholder: "Search by guest, hotel or comment",
    cards: (s) => [
      { label: "Total Reviews", value: s.totalReviews.toLocaleString("en-IN"), tone: "blue", icon: MessageSquare },
      { label: "Average Rating", value: `${s.averageRating.toFixed(2)} / 5`, tone: "amber", icon: Star },
      { label: "Positive (4-5 stars)", value: s.positive.toLocaleString("en-IN"), tone: "green", icon: Star },
      { label: "Negative (1-2 stars)", value: s.negative.toLocaleString("en-IN"), tone: "red", icon: Star },
    ],
    extra: (data) => {
      const max = Math.max(...data.distribution.map((d) => d.count), 1)
      return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <h2 className="text-sm font-bold text-slate-900 mb-2">Rating breakdown</h2>
          <div className="space-y-1.5">
            {data.distribution.map((d) => (
              <div key={d.rating} className="flex items-center gap-2 text-xs">
                <span className="w-12 text-slate-600">{d.rating} star{d.rating > 1 ? "s" : ""}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-amber-400" style={{ width: `${(d.count / max) * 100}%` }} /></div>
                <span className="w-8 text-right font-semibold text-slate-700">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    columns: [
      col("createdAt", "Date", "date"), col("guestName", "Guest"), col("hotelName", "Hotel"), col("rating", "Rating", "stars"),
      col("comment", "Comment", undefined, { className: "max-w-[320px]" }), col("status", "Status", "status"),
    ],
    actions: [{
      label: "Delete",
      run: async (row, reload) => {
        if (!window.confirm("Delete this review? This cannot be undone.")) return
        try {
          await adminAPI.remove("reviews", row._id)
          toast.success("Review deleted")
          reload()
        } catch (err) {
          toast.error(errorMessage(err))
        }
      },
    }],
  },
}
