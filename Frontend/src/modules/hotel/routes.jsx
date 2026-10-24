import { Routes, Route } from 'react-router-dom'

function HotelHome() {
  return <div className="p-6 text-xl font-semibold">Hotel module</div>
}

export default function HotelRoutes() {
  return (
    <Routes>
      <Route index element={<HotelHome />} />
    </Routes>
  )
}
