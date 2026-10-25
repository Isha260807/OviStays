import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Image as ImageIcon, Info, MapPin, Star } from 'lucide-react'
import { HomeNavbar } from '../../components/home/HomeNav.jsx'
import { C } from '../../components/home/homeUi.jsx'
import { useVillaDetails } from '../../hooks/useVillaDetails.js'
import {
  About, Amenities, CircleButton, GalleryTab, Highlights, Lightbox, Location, PhotoHeader, Policies, PriceBlock,
  Rating, ReviewsTab, ShareButton, Spaces, VideoModal, WishButton,
} from '../../components/villa/VillaParts.jsx'

const TABS = [
  { id: 'about', label: 'About', icon: Info },
  { id: 'gallery', label: 'Gallery', icon: ImageIcon },
  { id: 'reviews', label: 'Reviews', icon: Star },
]

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-[300px] md:h-[420px] bg-[#DDF3FF]" />
      <div className="px-4 py-5 space-y-3">
        <div className="h-7 w-2/3 rounded bg-[#DDF3FF]" />
        <div className="h-4 w-1/2 rounded bg-[#DDF3FF]" />
        <div className="h-24 rounded-2xl bg-[#DDF3FF]" />
      </div>
    </div>
  )
}

function Missing() {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <h1 className="font-serif-display text-2xl font-bold" style={{ color: C.ink }}>Villa not found</h1>
      <p className="mt-2 text-sm" style={{ color: C.muted }}>This villa is not available right now.</p>
      <Link to="/" className="inline-block mt-5 rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ background: C.primary }}>Back to Home</Link>
    </div>
  )
}

function BookButton({ id, className = '' }) {
  return (
    <Link to={`/villas/${id}/book`} className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-2.5 text-sm lg:px-8 lg:py-3 lg:text-base font-semibold text-white hover:opacity-90 transition-opacity ${className}`} style={{ background: C.primary }}>
      Book Now
    </Link>
  )
}

export default function VillaDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { villa, loading, notFound } = useVillaDetails(id)
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(null)
  const [video, setVideo] = useState(false)

  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'about'
  const setTab = (next) => setParams(next === 'about' ? {} : { tab: next }, { replace: true })

  const shell = (children) => (
    <div className="min-h-screen pb-28 md:pb-0 antialiased" style={{ background: C.cream, color: C.ink }}>
      <HomeNavbar />
      {children}
    </div>
  )

  if (loading) return shell(<Skeleton />)
  if (notFound || !villa) return shell(<Missing />)

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))
  const overlay = (
    <>
      <div className="absolute top-4 left-4 md:top-5 md:left-5"><CircleButton label="Go back" onClick={back}><ChevronLeft className="w-5 h-5" /></CircleButton></div>
      <div className="absolute top-4 right-4 md:top-5 md:right-5 flex gap-2.5"><WishButton id={villa.id} /><ShareButton title={villa.name} /></div>
    </>
  )

  return shell(
    <>
      <div className="max-w-[1360px] mx-auto md:px-6 lg:px-10 md:pt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <div className="min-w-0">
          <PhotoHeader photos={villa.photos} active={active} onActive={setActive} onOpen={setLightbox} overlay={overlay} />

          <div className="px-4 md:px-0 mt-5 space-y-6">
            <div>
              <span className="inline-block rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: C.primaryDark, background: C.peach, borderColor: '#BFE6FF' }}>{villa.propertyType}</span>
              <div className="mt-3 flex items-start justify-between gap-3">
                <h1 className="font-serif-display text-2xl lg:text-4xl font-bold leading-tight" style={{ color: C.ink }}>{villa.name}</h1>
                <Rating value={villa.rating} count={villa.reviewCount} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm" style={{ color: C.muted }}><MapPin className="w-4 h-4 shrink-0" style={{ color: C.primaryDark }} /> {villa.location}</p>
            </div>

            <Highlights items={villa.highlights} />

            <div role="tablist" className="flex border-b" style={{ borderColor: '#E2EDF5' }}>
              {TABS.map(({ id: tid, label, icon: Icon }) => (
                <button key={tid} type="button" role="tab" aria-selected={tab === tid} onClick={() => setTab(tid)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 -mb-px cursor-pointer transition-colors"
                  style={tab === tid ? { color: C.primaryDark, borderColor: C.primaryDark } : { color: C.muted, borderColor: 'transparent' }}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {tab === 'about' && (
              <div className="space-y-7">
                <About villa={villa} onPlay={() => setVideo(true)} />
                <Amenities items={villa.amenities} />
                <Spaces items={villa.spaces} />
                <Policies policies={villa.policies} />
                <Location villa={villa} />
              </div>
            )}
            {tab === 'gallery' && <GalleryTab photos={villa.photos} onOpen={setLightbox} />}
            {tab === 'reviews' && <ReviewsTab reviews={villa.reviews} />}
          </div>
        </div>

        {/* Desktop: the price card follows the page */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-3xl border bg-white p-6 shadow-[0_12px_36px_rgba(22,138,211,0.12)]" style={{ borderColor: '#E2EDF5' }}>
            <PriceBlock price={villa.price} />
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {villa.policies.checkIn && <div><dt style={{ color: C.muted }}>Check-in</dt><dd className="font-semibold">{villa.policies.checkIn}</dd></div>}
              {villa.policies.checkOut && <div><dt style={{ color: C.muted }}>Check-out</dt><dd className="font-semibold">{villa.policies.checkOut}</dd></div>}
              {villa.maxGuests > 0 && <div><dt style={{ color: C.muted }}>Guests</dt><dd className="font-semibold">Up to {villa.maxGuests}</dd></div>}
              {villa.bedrooms > 0 && <div><dt style={{ color: C.muted }}>Bedrooms</dt><dd className="font-semibold">{villa.bedrooms}</dd></div>}
            </dl>
            <BookButton id={villa.id} className="w-full mt-6" />
            <p className="mt-3 text-center text-xs" style={{ color: C.muted }}>The whole villa is booked for your stay</p>
          </div>
        </aside>
      </div>

      {/* Phone: price and Book Now stay at the bottom */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-[#F5FAFE]/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-3" style={{ borderColor: C.peach }}>
        <PriceBlock price={villa.price} note="Whole villa price" />
        <BookButton id={villa.id} />
      </div>

      {lightbox !== null && <Lightbox photos={villa.photos} start={lightbox} onClose={() => setLightbox(null)} />}
      {video && <VideoModal src={villa.video} onClose={() => setVideo(false)} />}
    </>
  )
}
