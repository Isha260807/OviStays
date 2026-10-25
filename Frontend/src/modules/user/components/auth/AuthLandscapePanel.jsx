import React from 'react'
import { BedDouble, Tag, ShieldCheck, Building2, Star } from 'lucide-react'

export default function AuthLandscapePanel({
  imageUrl,
  tagline = 'Your Perfect Stay Awaits.',
  subtagline = 'Book the best hotels and enjoy comfortable stays at great prices.',
}) {
  return (
    <div className="hidden lg:block lg:w-[50%] xl:w-[52%] relative min-h-screen select-none shrink-0">
      {/* Clipped image + content container */}
      <div className="absolute inset-0 overflow-hidden bg-[#111C24]">
        {/* Background Photography */}
        <img
          src={imageUrl || '/assets/auth/hotel_hero.jpg'}
          alt="OviStays Luxury Hotel"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 brightness-90"
        />

        {/* Cinematic Dark Gradient & Subtle Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/60 backdrop-blur-[1px]" />
      </div>

      {/* Content Layer (on top of everything) */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between p-12 xl:p-16 text-white">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#55B8F5] text-white font-bold flex items-center justify-center text-xl shadow-lg shadow-[#55B8F5]/30">
              O
            </div>
            <div>
              <span className="font-serif-display text-2xl font-bold tracking-tight">
                Ovi<span className="text-[#55B8F5]">Stays</span>
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-white/70 font-medium">
                Luxury Hotels &amp; Villas
              </span>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-medium text-white flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-[#55B8F5] text-[#55B8F5]" />
            <span>Top Rated Hospitality</span>
          </div>
        </div>

        {/* Center Editorial Showcase */}
        <div className="max-w-lg my-auto py-10">
          <div className="inline-block px-3.5 py-1 rounded-full bg-[#55B8F5]/25 border border-[#55B8F5]/40 text-[#55B8F5] text-xs font-semibold uppercase tracking-wider mb-4 backdrop-blur-sm">
            #Luxury Hospitality
          </div>

          <h1 className="font-serif-display text-4xl xl:text-5xl font-bold leading-tight drop-shadow-lg">
            {tagline}
          </h1>

          <p className="mt-4 text-base xl:text-lg text-white/85 leading-relaxed drop-shadow">
            {subtagline}
          </p>

          {/* 3 Value Propositions in Landscape Cards */}
          <div className="grid grid-cols-3 gap-3.5 mt-8">
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 text-left transition-all hover:bg-white/15">
              <div className="w-9 h-9 rounded-xl bg-[#55B8F5] text-white flex items-center justify-center mb-2.5 shadow-md shadow-[#55B8F5]/30">
                <BedDouble className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white">Wide Selection</div>
              <div className="text-[10px] text-white/75 mt-0.5 leading-snug">
                1,000+ handpicked hotels &amp; villas
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 text-left transition-all hover:bg-white/15">
              <div className="w-9 h-9 rounded-xl bg-[#55B8F5] text-white flex items-center justify-center mb-2.5 shadow-md shadow-[#55B8F5]/30">
                <Tag className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white">Best Price</div>
              <div className="text-[10px] text-white/75 mt-0.5 leading-snug">
                Guaranteed best rate booking deals
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 text-left transition-all hover:bg-white/15">
              <div className="w-9 h-9 rounded-xl bg-[#55B8F5] text-white flex items-center justify-center mb-2.5 shadow-md shadow-[#55B8F5]/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white">Secure Booking</div>
              <div className="text-[10px] text-white/75 mt-0.5 leading-snug">
                Encrypted payments &amp; 24/7 support
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Assurance */}
        <div className="flex items-center gap-2 text-xs text-white/75 border-t border-white/15 pt-5">
          <Building2 className="w-4 h-4 text-[#55B8F5]" />
          <span>Trusted by over 10M+ satisfied travelers worldwide</span>
        </div>
      </div>

      {/* ─── Organic Wavy Curve — carved into right edge, revealing white form ─── */}
      <svg
        className="absolute top-0 right-0 h-full z-20 pointer-events-none"
        style={{ width: '64px' }}
        viewBox="0 0 64 900"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* White fill curves from the far right (64) inward, masking the image edge */}
        <path
          d="M64,0 L64,900 L30,900 C46,780 56,700 38,600 C22,505 10,450 26,340 C40,235 54,165 30,0 Z"
          fill="#ffffff"
        />
      </svg>
    </div>
  )
}
