import { useEffect, useRef } from "react"
import { Info, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useToggles } from "@/core/settings/toggles.store.js"
import { errorMessage } from "@/services/api/axios.js"

const SWITCHES = [
  { field: "onlinePaymentOnly", title: "Online Payment Only", help: "Turn off pay-at-hotel everywhere", saved: "Online payment only" },
  { field: "maintenanceMode", title: "Maintenance Mode", help: "Suspend all guest bookings temporarily", saved: "Maintenance mode" },
  { field: "userRegistration", title: "Guest Registration", help: "Allow new guests to sign up", saved: "Guest registration" },
  { field: "hotelRegistration", title: "Hotel Registration", help: "Allow new hotels to apply to join", saved: "Hotel registration" },
]

function Switch({ checked, saving, label, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={saving}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
        checked ? "bg-blue-600" : "bg-slate-200"
      }`}
    >
      {saving ? (
        <Loader2 className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-white" />
      ) : (
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      )}
    </button>
  )
}

export default function ToggleManagement() {
  const { toggles, loading, saving, load, update } = useToggles()
  const amountTimer = useRef(null)
  const amountDraft = useRef(null)

  useEffect(() => {
    load().catch((err) => toast.error(errorMessage(err)))
    return () => clearTimeout(amountTimer.current)
  }, [load])

  const flip = async ({ field, saved }) => {
    try {
      await update({ [field]: !toggles[field] }, field)
      toast.success(`${saved} updated`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  // The amount is saved shortly after the typing stops
  const changeAmount = (value) => {
    amountDraft.current = value
    useToggles.setState((s) => ({ toggles: { ...s.toggles, maxPayAtHotelAmount: value } }))
    clearTimeout(amountTimer.current)
    amountTimer.current = setTimeout(async () => {
      try {
        await update({ maxPayAtHotelAmount: Number(amountDraft.current) || 0 }, "maxPayAtHotelAmount")
        toast.success("Max pay-at-hotel amount updated")
      } catch (err) {
        toast.error(err.message)
        load().catch(() => {})
      }
    }, 600)
  }

  if (loading && !toggles) {
    return (
      <div className="p-4 lg:p-6 min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }
  if (!toggles) return null

  const card = "flex items-center justify-between border border-slate-100 p-4 rounded-xl bg-slate-50/50"

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-full">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Toggle Management</h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">Enable or disable system modules and features dynamically.</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 max-w-md">
          <div className="mt-0.5"><Info className="w-4 h-4 text-amber-500" /></div>
          <div className="text-xs lg:text-sm text-slate-700">
            <p className="font-semibold text-amber-700 mb-0.5">Note</p>
            <p>Toggles save instantly when you switch them. The pay-at-hotel limit saves automatically after you stop typing.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-4 py-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">System Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SWITCHES.map((item) => (
              <div key={item.field} className={card}>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.help}</p>
                </div>
                <Switch checked={toggles[item.field]} saving={saving === item.field} label={item.title} onClick={() => flip(item)} />
              </div>
            ))}

            {!toggles.onlinePaymentOnly && (
              <div className={card}>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Max Pay-at-Hotel Amount</p>
                  <p className="text-xs text-slate-500 mt-0.5">Pay-at-hotel is turned off for bookings above this amount (0 for no limit)</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">₹</span>
                  <input
                    type="number"
                    min="0"
                    aria-label="Max pay-at-hotel amount"
                    value={toggles.maxPayAtHotelAmount}
                    onChange={(e) => changeAmount(e.target.value)}
                    className="w-24 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {saving === "maxPayAtHotelAmount" && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
