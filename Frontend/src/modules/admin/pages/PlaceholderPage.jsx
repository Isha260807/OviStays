import { useLocation } from "react-router-dom"

export default function PlaceholderPage() {
  const { pathname } = useLocation()
  const title = pathname.replace(/^\/admin\//, "").split("/").map((s) => s.replace(/-/g, " ")).join(" / ")
  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-2xl font-bold text-neutral-900 capitalize">{title}</h1>
      <p className="mt-2 text-sm text-neutral-500">This page is not built yet.</p>
    </div>
  )
}
