import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { MoreHorizontal, ChevronLeft } from 'lucide-react'
import { useAuthAssets } from '../../hooks/useAuthAssets.js'
import AuthHeroBanner from '../../components/auth/AuthHeroBanner.jsx'
import AuthLandscapePanel from '../../components/auth/AuthLandscapePanel.jsx'
import api, { errorMessage } from '@/services/api/axios.js'
import { useAuthStore } from '@/core/auth/auth.store.js'

export default function VerifyOtp() {
  const location = useLocation()
  const navigate = useNavigate()
  const { assets } = useAuthAssets()
  const setAuth = useAuthStore((state) => state.setAuth)

  const phone = location.state?.phone || '+91 98765 43210'
  const demoOtp = location.state?.demoOtp || '123456'

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [secondsLeft, setSecondsLeft] = useState(45)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const inputsRef = useRef([])

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return
    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [secondsLeft])

  // Auto focus first input on mount
  useEffect(() => {
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus()
    }
  }, [])

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    // Move to next input if digit entered
    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const newOtp = [...otp]
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i]
    }
    setOtp(newOtp)
    const nextIdx = Math.min(pasted.length, 5)
    inputsRef.current[nextIdx]?.focus()
  }

  const handleVerify = async (e) => {
    e?.preventDefault()
    setError('')
    setSuccessMsg('')

    const fullCode = otp.join('')
    if (fullCode.length < 6) {
      setError('Please enter all 6 digits of the OTP')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/user/auth/verify-otp', {
        phone,
        otp: fullCode,
      })

      if (response.data?.success) {
        const { token, user } = response.data.data
        setAuth({ token, user, role: 'user' })
        setSuccessMsg('Logged in successfully!')

        setTimeout(() => {
          navigate('/')
        }, 800)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (secondsLeft > 0) return
    setError('')
    try {
      await api.post('/user/auth/send-otp', { phone })
      setSecondsLeft(45)
      setSuccessMsg('A new OTP has been sent!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const formattedTimer = `00:${secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}`

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row overflow-x-hidden">
      {/* Laptop / Desktop Landscape Showcase (Left Panel) */}
      <AuthLandscapePanel
        imageUrl={assets.authHeroBanner}
        tagline={assets.authTagline}
        subtagline={assets.authSubtagline}
        tagText={assets.tagText}
      />

      {/* Form Section (Full width on mobile, 50% width on laptop) */}
      <div className="w-full lg:w-[50%] xl:w-[48%] min-h-screen bg-white flex flex-col justify-between">
        <div>
          {/* Mobile Hero Banner (Visible only on mobile/tablet) */}
          <div className="lg:hidden">
            <AuthHeroBanner
              imageUrl={assets.authHeroBanner}
              tagline={assets.authTagline}
              subtagline={assets.authSubtagline}
              showBack={true}
              onBack={() => navigate('/auth/login')}
            />
          </div>

          {/* Form Content (Centered and Spacious on Laptop) */}
          <div className="w-full max-w-md mx-auto px-6 sm:px-8 pt-4 lg:pt-12 pb-4">
            {/* Desktop Back Button & Brand Logo */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <button
                type="button"
                onClick={() => navigate('/auth/login')}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111111] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </button>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#55B8F5] text-white font-bold flex items-center justify-center text-xs shadow-sm">
                  O
                </div>
                <span className="font-serif-display text-lg font-bold text-[#111111]">
                  Ovi<span className="text-[#55B8F5]">Stays</span>
                </span>
              </div>
            </div>

            {/* Circular Primary Badge in #55B8F5 */}
            <div className="auth-header-badge">
              <MoreHorizontal className="w-6 h-6 text-white" />
            </div>

            {/* Header Titles */}
            <div className="text-center mb-5">
              <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-[#111111]">
                Verify OTP
              </h2>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-1.5 leading-relaxed">
                We have sent a 6-digit OTP to <br />
                <span className="font-semibold text-[#111111]">{phone}</span>{' '}
                <Link
                  to="/auth/login"
                  className="font-semibold text-[#55B8F5] hover:underline ml-1"
                >
                  Change
                </Link>
              </p>
            </div>

            {/* Demo Helper Banner in Soft Blue */}
            {demoOtp && (
              <div className="mb-4 px-3 py-1.5 rounded-lg bg-[#EEF9FF] border border-[#E2EDF5] text-[11px] text-[#168AD3] text-center font-medium">
                Demo OTP: <span className="font-mono font-bold tracking-wider text-[#111111]">{demoOtp}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-[#DC2626]/30 text-[#DC2626] text-xs text-center font-medium">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-[#15803D]/30 text-[#15803D] text-xs text-center font-medium">
                {successMsg}
              </div>
            )}

            {/* 6 Digit OTP Inputs */}
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputsRef.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="otp-digit-box"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {/* Resend Section */}
              <div className="text-center text-xs text-[#6B7280]">
                Didn't receive the code?{' '}
                {secondsLeft > 0 ? (
                  <span className="text-[#6B7280] font-medium">
                    Resend OTP in <span className="font-mono font-semibold text-[#55B8F5]">{formattedTimer}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="font-semibold text-[#55B8F5] hover:text-[#289FE8] transition-colors cursor-pointer"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              {/* Verify OTP Button */}
              <button
                type="submit"
                disabled={loading || otp.join('').length < 6}
                className="btn-luxury-primary"
              >
                <span>{loading ? 'Verifying...' : 'Verify OTP'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
