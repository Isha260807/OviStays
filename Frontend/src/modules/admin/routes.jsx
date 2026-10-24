import { Routes, Route } from "react-router-dom"
import AdminLayout from "./components/AdminLayout.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import PlaceholderPage from "./pages/PlaceholderPage.jsx"

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="*" element={<PlaceholderPage />} />
      </Route>
    </Routes>
  )
}
