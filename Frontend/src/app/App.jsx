import { Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { syncAuthArea } from '@/core/auth/auth.store.js'
import { moduleRoutes } from './routes.jsx'
import { useBranding } from '@/core/settings/branding.store.js'
import { applyBranding } from '@/shared/utils/branding.js'

export default function App() {
  const { pathname } = useLocation()
  // Each area (admin, host, guest) keeps its own sign-in
  useEffect(() => { syncAuthArea(pathname) }, [pathname])

  // Show the cached title/favicon straight away, then refresh from the server
  useEffect(() => {
    applyBranding(useBranding.getState().settings)
    useBranding.getState().load()
  }, [])

  return (
    <Suspense fallback={null}>
      <Routes>
        {moduleRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Routes>
    </Suspense>
  )
}
