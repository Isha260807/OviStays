import { useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { Hotel, Loader2 } from "lucide-react"
import { useAuthStore } from "@/core/auth/auth.store.js"
import { errorMessage } from "@/services/api/axios.js"
import { adminAPI } from "../services/adminAPI.js"

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, role, setAuth } = useAuthStore()
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (token && role === "admin") return <Navigate to="/admin" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const { token: newToken, admin } = await adminAPI.login(form)
      setAuth({ token: newToken, user: admin, role: "admin" })
      navigate(location.state?.from || "/admin", { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.28)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-white">
            <Hotel className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Admin Panel</p>
            <h1 className="text-2xl font-semibold text-neutral-900">OviStays</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
            <input
              id="email" type="email" required autoComplete="username" autoFocus
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700">Password</label>
            <input
              id="password" type="password" required autoComplete="current-password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
            />
          </div>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
