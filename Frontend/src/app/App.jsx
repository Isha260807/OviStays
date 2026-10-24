import { Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { moduleRoutes } from './routes.jsx'
import { useBranding } from '@/core/settings/branding.store.js'
import { applyBranding } from '@/shared/utils/branding.js'

export default function App() {
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
