import { Routes, Route, Navigate } from "react-router-dom"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import AdminLayout from "./components/AdminLayout.jsx"
import Login from "./pages/Login.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import ListPage from "./pages/ListPage.jsx"
import FormPage from "./pages/FormPage.jsx"
import { listConfigs, formConfigs } from "./constants/pageConfigs.js"

// Every sidebar path is registered from its config. `key` resets page state when switching pages.
export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          {Object.entries(listConfigs).map(([path, config]) => (
            <Route key={path} path={path} element={<ListPage key={path} config={config} />} />
          ))}
          {Object.entries(formConfigs).map(([path, config]) => (
            <Route key={path} path={path} element={<FormPage key={path} config={config} />} />
          ))}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
