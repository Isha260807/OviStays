import { lazy } from 'react'

const AdminRoutes = lazy(() => import('@admin/routes.jsx'))
const UserRoutes = lazy(() => import('@user/routes.jsx'))
const HotelRoutes = lazy(() => import('@hotel/routes.jsx'))

// Each module owns its own routes; the app only mounts them by prefix.
export const moduleRoutes = [
  { path: '/admin/*', element: <AdminRoutes /> },
  { path: '/hotel/*', element: <HotelRoutes /> },
  { path: '/*', element: <UserRoutes /> },
]
