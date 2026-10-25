import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Phone, UserPlus, ChevronLeft } from 'lucide-react'
import { useAuthAssets } from '../../hooks/useAuthAssets.js'
import AuthHeroBanner from '../../components/auth/AuthHeroBanner.jsx'
import AuthLandscapePanel from '../../components/auth/AuthLandscapePanel.jsx'
import api, { errorMessage } from '@/services/api/axios.js'

export default function Signup() {
  const navigate = useNavigate()
  const { assets } = useAuthAssets()

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    agreeTerms: true,
  })
  const [countryCode, setCountryCode] = useState('+91')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Please enter your full name')
      return
    }

    const cleanPhone = formData.phone.trim().replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }

    if (!formData.agreeTerms) {
      setError('Please accept the Terms & Conditions and Privacy Policy to continue')
      return
    }

    setLoading(true)
    try {
      const fullPhone = `${countryCode} ${cleanPhone}`
      const response = await api.post('/user/auth/register', {
        name: formData.name.trim(),
        phone: fullPhone,
      })

      // Navigate to OTP verification page
      navigate('/auth/verify-otp', {
        state: {
          phone: fullPhone,
          name: formData.name.trim(),
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
          <div className="w-full max-w-md mx-auto px-6 sm:px-8 pt-4 lg:pt-10 pb-4">
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
              <UserPlus className="w-5 h-5 text-white" />
            </div>

            {/* Header Titles */}
            <div className="text-center mb-4">
              <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-[#111111]">
                Create Account
              </h2>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
                Sign up to book your dream villa and manage your stays easily.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-[#DC2626]/30 text-[#DC2626] text-xs text-center font-medium">
                {error}
              </div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleSignup} className="space-y-3.5">
              {/* Full Name */}
              <div className="auth-input-wrapper">
                <div className="pl-3.5 text-[#6B7280]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  className="auth-input pl-2.5"
                  required
                />
              </div>

              {/* Mobile Number */}
              <div className="auth-input-wrapper">
                <div className="flex items-center pl-3 pr-2 py-2 border-r border-[#E2EDF5] text-xs font-semibold text-[#111111] select-none">
                  <Phone className="w-3.5 h-3.5 text-[#6B7280] mr-1.5" />
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer pr-0.5 text-xs font-semibold text-[#111111]"
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                  </select>
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Mobile Number"
                  maxLength={12}
                  className="auth-input"
                  required
                />
              </div>

              {/* Terms and Privacy Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 rounded text-[#55B8F5] focus:ring-[#55B8F5] accent-[#55B8F5] cursor-pointer"
                />
                <label
                  htmlFor="agreeTerms"
                  className="text-[11.5px] text-[#6B7280] leading-tight select-none cursor-pointer"
                >
                  I agree to the{' '}
                  <span className="font-medium text-[#111111] underline underline-offset-2">
                    Terms &amp; Conditions
                  </span>{' '}
                  and{' '}
                  <span className="font-medium text-[#111111] underline underline-offset-2">
                    Privacy Policy
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-luxury-primary mt-2"
              >
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              </button>
            </form>

            {/* Link to Sign In */}
            <p className="mt-3 text-center text-xs text-[#6B7280]">
              Already have an account?{' '}
              <Link
                to="/auth/login"
                className="font-semibold text-[#55B8F5] hover:text-[#289FE8] transition-colors ml-1"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
