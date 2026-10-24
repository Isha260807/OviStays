import { CalendarCheck, Building2, Users, IndianRupee } from "lucide-react"

const stats = [
  { label: "Total Bookings", value: "0", icon: CalendarCheck },
  { label: "Total Hotels", value: "0", icon: Building2 },
  { label: "Total Customers", value: "0", icon: Users },
  { label: "Revenue", value: "0", icon: IndianRupee },
]

export default function Dashboard() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">{label}</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{value}</p>
            </div>
            <div className="p-3 rounded-lg bg-black text-white"><Icon className="w-5 h-5" /></div>
          </div>
        ))}
      </div>
    </div>
  )
}
