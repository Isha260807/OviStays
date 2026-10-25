import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "@/core/auth/auth.store.js"

// superAdminOnly: also requires the main ADMIN account (sub admins are sent back to the dashboard).
// The server enforces this too; this only keeps the UI from showing pages that would fail.
export default function ProtectedRoute({ superAdminOnly = false }) {
  const { token, role, user } = useAuthStore()
  const location = useLocation()

  if (!token || role !== "admin") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  if (superAdminOnly && user?.role !== "ADMIN") {
    return <Navigate to="/admin" replace />
  }
  return <Outlet />
}
