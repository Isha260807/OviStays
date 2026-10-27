import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Phone, Mail, UserPlus, ChevronLeft } from 'lucide-react'
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
    email: '',
    agreeTerms: false,
  })

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

    const email = formData.email.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (!formData.agreeTerms) {
      setError('Please accept the Terms & Conditions and Privacy Policy to continue')
      return
    }

    setLoading(true)
    try {
      const fullPhone = `+91 ${cleanPhone}`
      const response = await api.post('/user/auth/register', {
        name: formData.name.trim(),
        phone: fullPhone,
        email: email || undefined,
        acceptTerms: true,
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
      <div className="w-full lg:w-[50%] xl:w-[48%] min-h-screen min-h-dvh bg-white flex flex-col justify-between">
        <div className="flex min-h-screen min-h-dvh flex-col">
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
          <div className="w-full max-w-md mx-auto flex flex-1 flex-col gap-[clamp(0.75rem,2.2dvh,1.25rem)] px-[clamp(1.25rem,6vw,2rem)] pt-[clamp(0.5rem,2dvh,1rem)] lg:pt-10 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {/* Desktop Back Button & Brand Logo */}
            <div className="hidden lg:flex items-center justify-between">
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
            <div className="auth-header-badge !w-10 !h-10 !mb-0 !shrink-0 sm:!w-[52px] sm:!h-[52px]">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>

            {/* Header Titles */}
            <div className="text-center">
              <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-[#111111]">
                Create Account
              </h2>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
                Sign up to book your dream villa and manage your stays easily.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-[#DC2626]/30 text-[#DC2626] text-xs text-center font-medium">
                {error}
              </div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleSignup} className="flex flex-col gap-[clamp(0.625rem,1.8dvh,0.875rem)]">
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
                  className="auth-input !py-1.5 sm:!py-[0.85rem] pl-2.5"
                  required
                />
              </div>

              {/* Mobile Number */}
              <div className="auth-input-wrapper">
                <div className="flex items-center pl-3 pr-2 py-1.5 sm:py-2 border-r border-[#E2EDF5] text-xs font-semibold text-[#111111] select-none">
                  <Phone className="w-3.5 h-3.5 text-[#6B7280] mr-1.5" />
                  <span aria-label="Country code">+91</span>
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Mobile Number"
                  maxLength={12}
                  className="auth-input !py-1.5 sm:!py-[0.85rem]"
                  required
                />
              </div>


              {/* Optional Email */}
              <div className="auth-input-wrapper">
                <div className="pl-3.5 text-[#6B7280]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email Address (Optional)"
                  className="auth-input !py-1.5 sm:!py-[0.85rem] pl-2.5"
                />
              </div>
              {/* Terms and Privacy Checkbox */}
              <div className="flex items-start gap-2.5">
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
                className="btn-luxury-primary !py-2.5 sm:!py-[0.95rem]"
              >
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              </button>
            </form>

            {/* Link to Sign In */}
            <p className="text-center text-xs text-[#6B7280]">
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
