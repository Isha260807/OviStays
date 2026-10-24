import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Menu, Search, Bell, BellOff, ChevronDown, User, Settings, LogOut, Hotel } from "lucide-react"
import { toast } from "sonner"
import { useAuthStore } from "@/core/auth/auth.store.js"

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onOutside() }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [ref, onOutside])
}

export default function AdminNavbar({ onMenuClick }) {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const profileRef = useRef(null)
  const notifRef = useRef(null)
  useClickOutside(profileRef, () => setProfileOpen(false))
  useClickOutside(notifRef, () => setNotifOpen(false))

  const name = user?.name || "Admin User"
  const email = user?.email || "admin@ovistays.com"
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)

  const handleLogout = () => {
    clearAuth()
    toast.success("Logged out")
    navigate("/admin")
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
              <Hotel className="h-6 w-6 text-red-600" />
            </div>
            <span className="hidden max-w-40 truncate text-red-600 font-extrabold text-xl ml-1 tracking-tight sm:block">
              OviStays
            </span>
          </div>
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
