import { Routes, Route } from 'react-router-dom'

function UserHome() {
  return <div className="p-6 text-xl font-semibold">User module</div>
}

export default function UserRoutes() {
  return (
    <Routes>
      <Route index element={<UserHome />} />
    </Routes>
  )
}
