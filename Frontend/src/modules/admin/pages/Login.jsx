import { useRef, useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ShieldCheck, Heart, ArrowRight, Loader2, Mail, Lock, Eye, EyeOff, Hotel } from "lucide-react"
import { toast } from "sonner"
import { useAuthStore } from "@/core/auth/auth.store.js"
import { errorMessage } from "@/services/api/axios.js"
import { assetUrl } from "@/services/api/config.js"
import { useBranding } from "@/core/settings/branding.store.js"
import { adminAPI } from "../services/adminAPI.js"

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, role, setAuth } = useAuthStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)
  const branding = useBranding((s) => s.settings)
  const companyName = branding?.companyName || "OviStays"
  const logoUrl = assetUrl(branding?.logo?.url)

  if (token && role === "admin") return <Navigate to="/admin" replace />

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please fill in all fields")
      return
    }
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    try {
      const { token: newToken, admin } = await adminAPI.login({ email: email.trim(), password })
      setAuth({ token: newToken, user: admin, role: "admin" })
      toast.success("Welcome, Administrator")
      navigate(location.state?.from || "/admin", { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden font-['Poppins']">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-[440px]"
        >
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative w-32 h-32 md:w-36 md:h-36 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-4 border-white mx-auto mb-4 bg-white flex flex-col items-center justify-center"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="h-full w-full rounded-full object-contain p-4" />
              ) : (
                <>
                  <Hotel className="w-12 h-12 text-primary" />
                  <span className="mt-1 text-lg font-extrabold tracking-tight text-primary font-['Outfit']">{companyName}</span>
                </>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em]"
            >
              ADMIN PANEL
            </motion.p>
          </div>

          {/* Login Card */}
          <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] p-8 sm:p-12 shadow-[0_40px_80px_-20px_rgba(229,46,46,0.2)] border border-white/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

            <div className="mb-10 text-center sm:text-left">
              <h2 className="text-3xl font-black text-gray-900 mb-2 font-['Outfit'] tracking-tight">Admin Entry</h2>
              <div className="h-1 w-10 bg-primary rounded-full mb-3 hidden sm:block" />
              <p className="text-base text-gray-500 font-medium">Authorized access only. Please sign in to continue.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoFocus
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-12 pr-6 py-4 bg-gray-50 text-gray-900 border-2 border-transparent focus:border-primary/50 rounded-2xl outline-none transition-all placeholder:text-gray-300 font-bold"
                      placeholder="admin@ovistays.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="px-1">
                    <label htmlFor="password" className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Password</label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-12 pr-12 py-4 bg-gray-50 text-gray-900 border-2 border-transparent focus:border-primary/50 rounded-2xl outline-none transition-all placeholder:text-gray-300 font-bold"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary hover:bg-[#c92424] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group overflow-hidden relative"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span>Enter Dashboard</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
                <motion.div
                  className="absolute inset-0 bg-white/20 translate-x-[-100%]"
                  whileHover={{ translateX: "100%" }}
                  transition={{ duration: 0.6 }}
                />
              </button>
            </form>
          </div>

          <div className="mt-12 flex justify-center items-center gap-6 opacity-30 grayscale hover:opacity-60 transition-opacity">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Secure Access</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Admin Control</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
