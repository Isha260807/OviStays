import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BedDouble, Tag, ShieldCheck, ArrowRight } from 'lucide-react'
import { useAuthAssets } from '../../hooks/useAuthAssets.js'
import AuthHeroBanner from '../../components/auth/AuthHeroBanner.jsx'
import AuthLandscapePanel from '../../components/auth/AuthLandscapePanel.jsx'
import api, { errorMessage } from '@/services/api/axios.js'

export default function Login() {
  const navigate = useNavigate()
  const { assets } = useAuthAssets()

  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSendOtp = async (e) => {
    e?.preventDefault()
    setError('')

    const cleanPhone = phone.trim().replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    try {
      const fullPhone = `${countryCode} ${cleanPhone}`
      const response = await api.post('/user/auth/send-otp', {
        phone: fullPhone,
      })

      // Navigate to verify OTP page with state
      navigate('/auth/verify-otp', {
        state: {
          phone: fullPhone,
          demoOtp: response.data?.data?.demoOtp || '123456',
        },
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

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
      <div className="w-full lg:w-[50%] xl:w-[48%] min-h-screen bg-white flex flex-col justify-between lg:justify-center">
        <div>
          {/* Mobile Hero Banner with Organic Wavy Curve (Visible only on mobile/tablet) */}
          <div className="lg:hidden">
            <AuthHeroBanner
              imageUrl={assets.authHeroBanner}
              tagline={assets.authTagline}
              subtagline={assets.authSubtagline}
            />

            {/* Mobile 3 Value Proposition Cards */}
            <div className="grid grid-cols-3 gap-2 px-5 py-4 border-b border-[#E2EDF5]">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-[#DDF3FF] flex items-center justify-center text-[#168AD3] mb-1.5 shadow-xs">
                  <BedDouble className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold text-[#111111] leading-tight">
                  Wide Selection
                </span>
                <span className="text-[9.5px] text-[#6B7280] mt-0.5 leading-tight">
                  1000+ villas to choose from
                </span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-[#DDF3FF] flex items-center justify-center text-[#168AD3] mb-1.5 shadow-xs">
                  <Tag className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold text-[#111111] leading-tight">
                  Best Price
                </span>
                <span className="text-[9.5px] text-[#6B7280] mt-0.5 leading-tight">
                  Guaranteed deals
                </span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-[#DDF3FF] flex items-center justify-center text-[#168AD3] mb-1.5 shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold text-[#111111] leading-tight">
                  Secure Booking
                </span>
                <span className="text-[9.5px] text-[#6B7280] mt-0.5 leading-tight">
                  Data always safe
                </span>
              </div>
            </div>
          </div>

          {/* Form Content (Centered and Spacious on Laptop) */}
          <div className="w-full max-w-md mx-auto px-6 sm:px-8 pt-6 lg:pt-16 pb-4">
            {/* Desktop Brand Logo indicator */}
            <div className="hidden lg:flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-[#55B8F5] text-white font-bold flex items-center justify-center text-sm shadow-md shadow-[#55B8F5]/30">
                O
              </div>
              <span className="font-serif-display text-xl font-bold text-[#111111]">
                Ovi<span className="text-[#55B8F5]">Stays</span>
              </span>
            </div>

            {/* Heading */}
            <div className="text-center lg:text-left mb-4">
              <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">
                Welcome Back!
              </h2>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
                Login or create your account using your mobile number
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-[#DC2626]/30 text-[#DC2626] text-xs text-center font-medium">
                {error}
              </div>
            )}

            {/* Mobile Number Input Form */}
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="auth-input-wrapper">
                {/* Country Code Selector */}
                <div className="flex items-center pl-3.5 pr-2 py-2 border-r border-[#E2EDF5] text-xs font-semibold text-[#111111] select-none">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer pr-1 text-xs font-semibold text-[#111111]"
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+971">+971</option>
                  </select>
                </div>

                {/* Input */}
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter mobile number"
                  maxLength={12}
                  className="auth-input"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-luxury-primary"
              >
                <span>{loading ? 'Sending OTP...' : 'Send OTP'}</span>
                {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
              </button>
            </form>

            {/* Link only */}
            <div className="mt-3 text-center lg:text-left">
              <p className="text-xs text-[#6B7280]">
                Don't have an account?{' '}
                <Link
                  to="/auth/signup"
                  className="font-semibold text-[#55B8F5] hover:text-[#289FE8] transition-colors ml-1"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
