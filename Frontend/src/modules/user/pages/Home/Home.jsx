import { Link } from 'react-router-dom'
import { ArrowRight, Headphones, Shield, Star, Tag, Zap } from 'lucide-react'
import { HomeNavbar, BottomNav, Logo } from '../../components/home/HomeNav.jsx'
import HomeHero from '../../components/home/HomeHero.jsx'
import Reels from '../../components/home/Reels.jsx'
import { C, Rail, SectionHeader } from '../../components/home/homeUi.jsx'
import {
  GatewayCard, OverlayCard, PackageCard, RankedCard, RowCard,
} from '../../components/home/VillaCards.jsx'
import {
  BEACH_VILLAS, BEST_DEALS, HILL_RETREATS, OFFER_OF_THE_DAY, POOL_VILLAS, POPULAR_VILLAS, PROMO, REELS,
  CATEGORIES, TRUST_POINTS, WEEKEND_GETAWAYS, formatPrice,
} from '../../data/homeData.js'

const TRUST_ICONS = { Tag, Support: Headphones, Zap, Shield }

const Section = ({ children }) => <section className="mt-9 lg:mt-14">{children}</section>

// Round photo categories: swipe on phones, spread out on desktop
function Categories() {
  return (
    <div className="-mx-4 px-4 md:mx-0 md:px-0 flex gap-4 md:gap-6 overflow-x-auto md:justify-between lg:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CATEGORIES.map(({ label, image, to }) => (
        <Link key={label} to={to} className="flex flex-col items-center gap-2 shrink-0 group">
          <span className="block w-[68px] h-[68px] lg:w-24 lg:h-24 rounded-full overflow-hidden ring-2 ring-white shadow-[0_2px_6px_rgba(17,17,17,0.15)]">
            <img src={image} alt={label} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          </span>
          <span className="text-[11px] lg:text-sm font-semibold" style={{ color: C.ink }}>{label}</span>
        </Link>
      ))}
    </div>
  )
}

function PromoBanner() {
  return (
    <Link to="/offers" className="relative flex items-center rounded-3xl overflow-hidden min-h-[168px] lg:min-h-[230px] shadow-[0_8px_24px_rgba(22,138,211,0.12)]">
      <img src={PROMO.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/5" />
      <div className="relative p-4 lg:p-10 max-w-[320px] lg:max-w-lg">
        <h3 className="font-serif-display text-xl lg:text-5xl font-bold text-white">{PROMO.title}</h3>
        <p className="text-xs lg:text-lg mt-1 text-white/90">{PROMO.line1}</p>
        <p className="text-xs lg:text-lg text-white/90">
          {PROMO.line2} <span className="font-bold text-[#8FD3FF]">{PROMO.code}</span>
        </p>
        <span className="inline-flex items-center gap-2 mt-3 lg:mt-5 px-4 py-2 lg:px-6 lg:py-2.5 rounded-full text-white font-semibold text-xs lg:text-base" style={{ background: C.primary }}>
          {PROMO.cta} <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  )
}

function OfferOfTheDay() {
  const o = OFFER_OF_THE_DAY
  return (
    <Link to={`/villas/${o.id}`} className="relative block rounded-3xl overflow-hidden h-[190px] lg:h-[380px] group shadow-[0_8px_24px_rgba(22,138,211,0.15)]">
      <img src={o.image} alt={o.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
      <div className="absolute left-5 top-5 lg:left-10 lg:top-10 text-white">
        <h3 className="font-serif-display text-2xl lg:text-5xl font-bold">{o.name}</h3>
        <p className="text-xs lg:text-base text-white/80 mt-1 max-w-[190px] lg:max-w-sm">{o.location}</p>
        <span className="inline-flex items-center gap-1.5 mt-3 bg-white/90 rounded-full px-3 py-1 text-xs lg:text-sm font-semibold" style={{ color: C.ink }}>
          <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-3 h-3" fill="#F5A524" stroke="#F5A524" />)}</span>
          {o.rating} <span className="font-normal text-[#6B7280]">({o.reviews} reviews)</span>
        </span>
      </div>
      <div className="absolute right-0 bottom-0 px-5 py-3 lg:px-10 lg:py-6 rounded-tl-3xl text-white text-right" style={{ background: C.primary }}>
        <p className="text-2xl lg:text-4xl font-bold leading-none">{formatPrice(o.price)}</p>
        <p className="text-[11px] lg:text-sm mt-1 text-white/85">per night</p>
      </div>
    </Link>
  )
}

function TrustStrip() {
  return (
    <div className="grid grid-cols-4 gap-2 lg:gap-8 pt-6 border-t lg:max-w-4xl lg:mx-auto" style={{ borderColor: C.peach }}>
      {TRUST_POINTS.map(({ icon, title, subtitle }) => {
        const Icon = TRUST_ICONS[icon]
        return (
          <div key={title} className="flex flex-col lg:flex-row items-center lg:gap-3 text-center lg:text-left" style={{ color: C.primaryDark }}>
            <Icon className="w-5 h-5 lg:w-8 lg:h-8 shrink-0" />
            <p className="text-[11px] lg:text-sm font-medium leading-tight mt-1.5 lg:mt-0" style={{ color: C.ink }}>{title}<br />{subtitle}</p>
          </div>
        )
      })}
    </div>
  )
}

function Footer() {
  return (
    <footer className="hidden md:block mt-16 border-t" style={{ borderColor: C.peach, background: '#EEF9FF' }}>
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10 flex items-center justify-between gap-6">
        <div>
          <Logo />
          <p className="text-sm mt-3 max-w-xs" style={{ color: C.muted }}>Handpicked private villas for family trips, weddings and weekend getaways.</p>
        </div>
        <nav className="flex gap-6 text-sm font-medium" style={{ color: C.muted }}>
          <Link to="/about" className="hover:underline">About</Link>
          <Link to="/support" className="hover:underline">Support</Link>
          <Link to="/terms" className="hover:underline">Terms</Link>
          <Link to="/privacy" className="hover:underline">Privacy</Link>
        </nav>
      </div>
      <p className="text-center text-xs pb-6" style={{ color: C.muted }}>© {new Date().getFullYear()} OviStays. All rights reserved.</p>
    </footer>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen pb-24 md:pb-0 antialiased" style={{ background: C.cream, color: C.ink }}>
      <HomeNavbar />
      <HomeHero />

      <main className="max-w-[1360px] mx-auto px-4 md:px-6 lg:px-10 mt-6 md:mt-12">
        <Categories />

        <Section>
          <SectionHeader title="Popular Destinations" />
          <Rail>{POPULAR_VILLAS.map((v) => <OverlayCard key={v.id} villa={v} />)}</Rail>
        </Section>

        <Section><PromoBanner /></Section>

        <Section>
          <SectionHeader title="Best Deals" action="View All" />
          <div className="grid gap-4 lg:grid-cols-3">{BEST_DEALS.map((v) => <RowCard key={v.id} villa={v} />)}</div>
        </Section>

        <Section>
          <SectionHeader title="Villa Vibes" subtitle="quick tours, just a few seconds each" action={null} />
          <Reels reels={REELS} />
        </Section>

        <Section>
          <SectionHeader title="Private Pool Villas" action="View All" to="/villas?type=pool" />
          <Rail cols="lg:grid-cols-3">{POOL_VILLAS.map((v) => <PackageCard key={v.id} villa={v} />)}</Rail>
        </Section>

        <Section>
          <SectionHeader title="Weekend Getaways!" />
          <Rail cols="lg:grid-cols-3">{WEEKEND_GETAWAYS.map((p) => <GatewayCard key={p.id} place={p} />)}</Rail>
        </Section>

        <Section>
          <SectionHeader title="Hill Retreats" action="View All" to="/villas?type=hill" />
          <Rail cols="lg:grid-cols-3">{HILL_RETREATS.map((v) => <RankedCard key={v.id} villa={v} />)}</Rail>
        </Section>

        <Section>
          <SectionHeader title="Offer of the Day!" action={null} />
          <OfferOfTheDay />
        </Section>

        <Section>
          <SectionHeader title="Beachside Villas" action="View All" to="/villas?type=beach" />
          <Rail cols="lg:grid-cols-3">{BEACH_VILLAS.map((v) => <RowCard key={v.id} villa={v} rail />)}</Rail>
        </Section>

        <section className="mt-10 lg:mt-16"><TrustStrip /></section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  )
}
