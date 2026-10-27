import React, { useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthAssets } from '../../hooks/useAuthAssets.js'
import { hasSeenWelcome, markWelcomeSeen } from '@/core/auth/welcome.js'

export default function Welcome() {
  const navigate = useNavigate()
  const { assets } = useAuthAssets()
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768
  const seenWelcome = hasSeenWelcome()

  // Once this first-visit screen has been shown, future app visits go straight to login.
  useEffect(() => {
    if (!isDesktop && !seenWelcome) markWelcomeSeen()
  }, [isDesktop, seenWelcome])

  // Welcome page is strictly for mobile UI; on desktop/laptop redirect to login
  useEffect(() => {
    const checkViewport = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        navigate('/auth/login', { replace: true })
      }
    }
    checkViewport()
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [navigate])

  if (isDesktop || seenWelcome) return <Navigate to="/auth/login" replace />

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-[390px] min-h-screen flex flex-col items-center justify-start pt-3 sm:pt-5 pb-6 px-5 bg-white mx-auto select-none">
        {/* Top Visual Collage Section (Shifted up to top) */}
        <div className="relative w-full flex flex-col items-center pt-1">
          {/* Traveler Hero Cutout Image (Shifted up to top, clean transparent PNG) */}
          <div className="relative z-10 w-[290px] h-[300px] flex items-center justify-center overflow-visible">
            <img
              src={assets.welcomeTravelerImage || '/assets/auth/traveler_hero.png'}
              alt="Luxury Travel Experience"
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>

          {/* Overlapping Triple Photo Cards Collage */}
          <div className="relative -mt-20 w-full flex items-center justify-center z-20 pointer-events-none">
            {/* Card 1: Left Tilted Beach Card */}
            <div className="w-[90px] h-[118px] rounded-2xl overflow-hidden shadow-lg transform -rotate-8 -mr-4 border-2 border-white">
              <img
                src={assets.welcomeCard1 || '/assets/auth/card_beach.jpg'}
                alt="Tropical Beach"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Card 2: Center Elevated Infinity Pool Card */}
            <div className="w-[110px] h-[138px] rounded-2xl overflow-hidden shadow-2xl border-[3.5px] border-white z-10 transform scale-105">
              <img
                src={assets.welcomeCard2 || '/assets/auth/card_pool.jpg'}
                alt="Infinity Pool Sunset"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Card 3: Right Tilted Garden Patio Card */}
            <div className="w-[90px] h-[118px] rounded-2xl overflow-hidden shadow-lg transform rotate-8 -ml-4 border-2 border-white">
              <img
                src={assets.welcomeCard3 || '/assets/auth/card_patio.jpg'}
                alt="Luxury Garden Patio"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Bottom Editorial Content & Action */}
        <div className="w-full mt-3.5 text-center flex flex-col items-center">
          {/* Main Headline with Serif Elegance */}
          <h1 className="font-serif-display text-[1.65rem] sm:text-[1.8rem] font-bold text-[#111111] leading-tight">
            Find your{' '}
            <span className="italic font-normal text-[#55B8F5]">
              dream villa
            </span>
            <br />
            <span className="italic font-normal text-[#55B8F5]">
              anywhere
            </span>{' '}
            in the world
          </h1>

          {/* Subtitle in Muted Text */}
          <p className="mt-2 text-xs text-[#6B7280] leading-relaxed max-w-[280px]">
            {assets.welcomeSubtitle ||
              'Find and book exceptional private villas with a seamless and reliable booking experience.'}
          </p>

          {/* Action Button */}
          <div className="w-full mt-5 max-w-[320px]">
            <button
              type="button"
              onClick={() => navigate('/auth/login')}
              className="btn-luxury-primary text-[14.5px] py-3.5 tracking-wide shadow-md"
            >
              Let's Get Started
            </button>
          </div>

          {/* Bottom Link to Sign In */}
          <p className="mt-3.5 text-xs text-[#6B7280]">
            Already have an account?{' '}
            <Link
              to="/auth/login"
              className="font-semibold text-[#55B8F5] hover:text-[#289FE8] transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
