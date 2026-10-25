import { Routes, Route, Navigate } from 'react-router-dom'
import { Welcome, Login, Signup, VerifyOtp } from './pages/auth/index.js'

function UserHome() {
  return (
    <div className="min-h-screen bg-[#F5FAFE] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-[#111111] mb-2">
        Welcome to OviStays
      </h1>
      <p className="text-[#6B7280] text-sm max-w-md mb-6 leading-relaxed">
        Modern hotel booking experience with handpicked hotels, villas and suites worldwide.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <a
          href="/auth/welcome"
          className="px-5 py-2.5 rounded-full bg-[#55B8F5] text-white font-medium text-sm shadow-md shadow-[#55B8F5]/30 hover:bg-[#289FE8] active:bg-[#168AD3] transition-all"
        >
          View Welcome Screen
        </a>
        <a
          href="/auth/login"
          className="px-5 py-2.5 rounded-full border border-[#55B8F5] text-[#55B8F5] font-medium text-sm hover:bg-[#EEF9FF] active:bg-[#DDF3FF] transition-all"
        >
          Login Page
        </a>
        <a
          href="/auth/signup"
          className="px-5 py-2.5 rounded-full border border-[#E2EDF5] bg-white text-[#111111] font-medium text-sm hover:border-[#55B8F5] transition-all"
        >
          Sign Up Page
        </a>
      </div>
    </div>
  )
}

function AuthRedirect() {
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768
  return <Navigate to={isDesktop ? "/auth/login" : "/auth/welcome"} replace />
}

export default function UserRoutes() {
  return (
    <Routes>
      <Route index element={<UserHome />} />

      {/* User Auth Routes */}
      <Route path="auth" element={<AuthRedirect />} />
      <Route path="auth/welcome" element={<Welcome />} />
      <Route path="auth/login" element={<Login />} />
      <Route path="auth/signup" element={<Signup />} />
      <Route path="auth/verify-otp" element={<VerifyOtp />} />

      {/* Shorthand direct routes */}
      <Route path="welcome" element={<Welcome />} />
      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      <Route path="verify-otp" element={<VerifyOtp />} />

      {/* Fallback to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
