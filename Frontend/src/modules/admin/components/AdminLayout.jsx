import { useState, useEffect } from "react"
import { Outlet } from "react-router-dom"
import AdminSidebar from "./AdminSidebar"
import AdminNavbar from "./AdminNavbar"

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Smaller admin type: turns on the "admin-compact" text scale (see shared/styles/global.css)
  useEffect(() => {
    document.documentElement.classList.add("admin-compact")
    return () => document.documentElement.classList.remove("admin-compact")
  }, [])

  return (
    <div className="h-[100dvh] bg-neutral-200 flex overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-[60] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCollapseChange={setIsSidebarCollapsed}
      />

      <div
        className={`flex-1 flex min-h-0 flex-col transition-all duration-300 ease-in-out min-w-0 ${
          isSidebarCollapsed ? "lg:ml-20" : "lg:ml-80"
        }`}
      >
        <AdminNavbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 min-h-0 w-full max-w-full overflow-x-hidden overflow-y-auto bg-neutral-100">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
