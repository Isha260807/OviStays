import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Menu, Search, Bell, BellOff, ChevronDown, User, Settings, LogOut, Hotel, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuthStore } from "@/core/auth/auth.store.js"
import { useBranding } from "@/core/settings/branding.store.js"
import { useToggles } from "@/core/settings/toggles.store.js"
import { assetUrl } from "@/services/api/config.js"

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onOutside() }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [ref, onOutside])
}

// Quick maintenance switch next to the brand; shares its state with Toggle Management.
function MaintenanceToggle() {
  const { toggles, saving, load, update } = useToggles()

  useEffect(() => { load().catch(() => {}) }, [load])
  if (!toggles) return null

  const on = toggles.maintenanceMode
  const busy = saving === "maintenanceMode"
  const handleClick = async () => {
    try {
      await update({ maintenanceMode: !on }, "maintenanceMode")
      toast.success(on ? "Maintenance mode is off. Bookings are live." : "Maintenance mode is on. Guest bookings are suspended.")
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="flex items-center pl-1 sm:pl-3 border-l border-neutral-200 ml-1 sm:ml-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Toggle maintenance mode"
        onClick={handleClick}
        disabled={busy}
        title={on ? "Maintenance mode is ON: guest bookings are suspended. Click to turn it off." : "Maintenance mode is OFF: the platform is live. Click to turn it on."}
        className={`group relative flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:py-1.5 rounded-full border transition-all duration-200 select-none ${
          on
            ? "bg-amber-50 border-amber-300 text-amber-900 shadow-sm hover:bg-amber-100/80"
            : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
        } ${busy ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          {on ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </>
          ) : (
            <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          )}
        </span>
        <span className="text-xs font-semibold tracking-tight hidden sm:inline">Maintenance</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${on ? "bg-amber-200 text-amber-900" : "bg-neutral-200/80 text-neutral-600"}`}>
          {on ? "ON" : "OFF"}
        </span>
        <span className={`relative inline-flex h-4 w-7 sm:h-5 sm:w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${on ? "bg-amber-500" : "bg-neutral-300"}`}>
          {busy ? (
            <Loader2 className="absolute inset-0 m-auto h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin text-white" />
          ) : (
            <span className={`pointer-events-none inline-block h-3 w-3 sm:h-3.5 sm:w-3.5 transform rounded-full bg-white shadow-sm transition duration-200 ${on ? "translate-x-3.5 sm:translate-x-5" : "translate-x-0.5 sm:translate-x-0.5"}`} />
          )}
        </span>
      </button>
    </div>
  )
}

export default function AdminNavbar({ onMenuClick }) {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const branding = useBranding((s) => s.settings)
  const companyName = branding?.companyName || "OviStays"
  const logoUrl = assetUrl(branding?.logo?.url)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const profileRef = useRef(null)
  const notifRef = useRef(null)
  useClickOutside(profileRef, () => setProfileOpen(false))
  useClickOutside(notifRef, () => setNotifOpen(false))

  const name = user?.name || "Admin User"
  const email = user?.email || ""
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)

  const handleLogout = () => {
    clearAuth()
    toast.success("Logged out")
    navigate("/admin/login")
  }

  return (
    <header
      className="sticky top-0 z-50 shrink-0 bg-white border-b border-neutral-200 shadow-sm"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-3">
        {/* Left: menu + brand */}
        <div className="flex min-w-0 items-center gap-1 sm:gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden shrink-0 p-2 rounded-md text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex min-w-0 items-center cursor-pointer" onClick={() => navigate("/admin")}>
            <div className="h-10 w-10 shrink-0 rounded-lg bg-white flex items-center justify-center overflow-hidden sm:h-12 sm:w-12">
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="h-9 w-9 object-contain sm:h-10 sm:w-10" />
              ) : (
                <Hotel className="h-6 w-6 text-red-600" />
              )}
            </div>
            <span className="hidden max-w-40 truncate text-red-600 font-extrabold text-xl ml-1 tracking-tight sm:block">
              {companyName}
            </span>
          </div>
          <MaintenanceToggle />
        </div>

        {/* Center: search pill */}
        <div className="hidden flex-1 justify-center max-w-md mx-4 md:flex xl:mx-8">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100 text-neutral-600 cursor-pointer hover:bg-neutral-200 transition-colors w-full border border-neutral-200">
            <Search className="w-4 h-4 text-neutral-700" />
            <span className="text-sm flex-1 text-left text-neutral-700">Search</span>
            <span className="text-xs px-2 py-0.5 rounded bg-white text-neutral-600 border border-neutral-200">Ctrl+K</span>
          </div>
        </div>

        {/* Right: notifications + profile */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 md:hidden">
            <Search className="h-5 w-5" />
          </button>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative h-10 w-10 rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 flex items-center justify-center hover:bg-neutral-100 transition-colors sm:h-11 sm:w-11"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 border border-neutral-200 shadow-2xl rounded-2xl overflow-hidden bg-white z-50">
                <div className="px-4 py-3 border-b border-neutral-200">
                  <p className="text-sm font-semibold text-neutral-900">Notifications</p>
                  <p className="text-xs text-neutral-500">Booking and support alerts</p>
                </div>
                <div className="px-6 py-10 text-center flex flex-col items-center gap-2">
                  <BellOff className="w-9 h-9 text-neutral-300" />
                  <p className="text-sm text-neutral-500">No notifications yet</p>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <div
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 pl-3 border-l border-neutral-200 cursor-pointer hover:bg-neutral-100 rounded-md px-2 py-1 transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 md:hidden">
                <User className="h-5 w-5" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-neutral-900">{name}</p>
                <p className="text-xs text-neutral-500">{email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-700 hidden md:block" />
            </div>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 text-neutral-900">
                <div className="p-4 border-b border-neutral-200 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center border border-neutral-300">
                    <span className="text-lg font-semibold text-neutral-600">{initials || "AD"}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{name}</p>
                    <p className="text-xs text-neutral-500 truncate">{email}</p>
                  </div>
                </div>
                <div className="p-1">
                  <button className="w-full flex items-center px-2 py-2 text-sm rounded hover:bg-neutral-100" onClick={() => { setProfileOpen(false); navigate("/admin/profile") }}>
                    <User className="mr-2 w-4 h-4" /> Profile
                  </button>
                  <button className="w-full flex items-center px-2 py-2 text-sm rounded hover:bg-neutral-100" onClick={() => { setProfileOpen(false); navigate("/admin/settings") }}>
                    <Settings className="mr-2 w-4 h-4" /> Settings
                  </button>
                </div>
                <div className="border-t border-neutral-200 p-1">
                  <button className="w-full flex items-center px-2 py-2 text-sm rounded text-red-600 hover:bg-red-50" onClick={handleLogout}>
                    <LogOut className="mr-2 w-4 h-4" /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
