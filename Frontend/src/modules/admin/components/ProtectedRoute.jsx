import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "@/core/auth/auth.store.js"

export default function ProtectedRoute() {
  const { token, role } = useAuthStore()
  const location = useLocation()

  if (!token || role !== "admin") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
