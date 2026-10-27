import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function AuthHeroBanner({
  imageUrl,
  tagline = 'Your Dream Villa Awaits.',
  subtagline = 'Book private villas and enjoy comfortable stays with family & friends at great prices.',
  showBack = false,
  onBack,
}) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <div className="relative w-full h-[clamp(215px,32dvh,300px)] shrink-0 overflow-hidden select-none">
      {/* Background Villa Image */}
      <img
        src={imageUrl || '/assets/auth/hotel_hero.jpg'}
        alt="OviStays Luxury Villa"
        className="block w-full h-full object-cover object-center"
      />

      {/* Subtle Top & Center Dark Gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/50" />

      {/* Back Button */}
      {showBack && (
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="absolute top-5 left-5 z-20 w-10 h-10 rounded-full bg-black/25 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/45 active:scale-95 transition-all cursor-pointer border border-white/10"
        >
          <ChevronLeft className="w-5 h-5 -ml-0.5" />
        </button>
      )}

      {/* Hero Typography Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col justify-center px-[clamp(1rem,6vw,2rem)] pt-2 pb-[clamp(1.75rem,6dvh,2.5rem)] text-white pointer-events-none">
        <h1 className="font-serif-display text-[clamp(1.35rem,6.5vw,1.65rem)] font-bold leading-tight drop-shadow-md">
          {tagline}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-white/90 max-w-[17rem] leading-snug sm:leading-relaxed drop-shadow">
          {subtagline}
        </p>
      </div>

      {/* Smooth Organic Bottom Wavy Mask transitioning into the cream background */}
      <svg
        className="hero-wavy-svg"
        viewBox="0 0 440 48"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0,28 C80,44 140,48 220,32 C300,16 370,12 440,28 L440,48 L0,48 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
