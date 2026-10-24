import { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { moduleRoutes } from './routes.jsx'

export default function App() {
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
