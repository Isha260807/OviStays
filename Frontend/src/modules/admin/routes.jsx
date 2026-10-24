import { Routes, Route, Navigate } from "react-router-dom"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import AdminLayout from "./components/AdminLayout.jsx"
import Login from "./pages/Login.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import ListPage from "./pages/ListPage.jsx"
import FormPage from "./pages/FormPage.jsx"
import BusinessSetup from "./pages/BusinessSetup.jsx"
import LegalPage from "./pages/content/LegalPage.jsx"
import AboutUs from "./pages/content/AboutUs.jsx"
import SocialMedia from "./pages/content/SocialMedia.jsx"
import BroadcastNotification from "./pages/settings/BroadcastNotification.jsx"
import ToggleManagement from "./pages/settings/ToggleManagement.jsx"
import EnvManagements from "./pages/developer/EnvManagements.jsx"
import ImageSetting from "./pages/developer/ImageSetting.jsx"
import DeveloperSettings from "./pages/developer/DeveloperSettings.jsx"
import { listConfigs, formConfigs } from "./constants/pageConfigs.js"

// Terms and privacy have one version per audience
const ROLES = [
  { id: "user", label: "User", key: "terms" },
  { id: "hotel", label: "Hotel", key: "terms_hotel" },
]
const PRIVACY_ROLES = [
  { id: "user", label: "User", key: "privacy" },
  { id: "hotel", label: "Hotel", key: "privacy_hotel" },
]

// Every sidebar path is registered from its config. `key` resets page state when switching pages.
export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<BusinessSetup />} />
          <Route path="broadcast-notification" element={<BroadcastNotification />} />
          <Route path="toggle-management" element={<ToggleManagement />} />
          <Route path="pages-social-media/about" element={<AboutUs />} />
          <Route path="pages-social-media/terms" element={<LegalPage title="Terms and Conditions" description="Manage Terms and Conditions content for guests and hotels" roles={ROLES} pageKey="terms" />} />
          <Route path="pages-social-media/privacy" element={<LegalPage title="Privacy Policy" description="Manage Privacy Policy content for guests and hotels" roles={PRIVACY_ROLES} pageKey="privacy" />} />
          <Route path="pages-social-media/refund" element={<LegalPage title="Refund Policy" description="Manage your Refund Policy content" pageKey="refund" />} />
          <Route path="pages-social-media/cancellation" element={<LegalPage title="Cancellation Policy" description="Manage your Cancellation Policy content" pageKey="cancellation" />} />
          <Route path="pages-social-media/social" element={<SocialMedia />} />
          {Object.entries(listConfigs).map(([path, config]) => (
            <Route key={path} path={path} element={<ListPage key={path} config={config} />} />
          ))}
          {Object.entries(formConfigs).map(([path, config]) => (
            <Route key={path} path={path} element={<FormPage key={path} config={config} />} />
          ))}
          <Route element={<ProtectedRoute superAdminOnly />}>
            <Route path="developer/env" element={<EnvManagements />} />
            <Route path="developer/image-setting" element={<ImageSetting />} />
            <Route path="developer/settings" element={<DeveloperSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
