import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, X } from 'lucide-react'
import { C, Rail } from './homeUi.jsx'
import { formatPrice } from '../../data/homeData.js'

// Portrait tile with the label centered at the bottom. A reel with a `video` plays muted on a loop.
function ReelMedia({ reel, className = '' }) {
  if (reel.video) {
    return (
      <video
        src={reel.video}
        poster={reel.image}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        className={className}
      />
    )
  }
  return <img src={reel.image} alt={reel.title} loading="lazy" className={className} />
}

function ReelCard({ reel, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Play reel: ${reel.title}`}
      className="relative block shrink-0 snap-start w-[calc((100vw-2.5rem)/2.3)] aspect-[3/4.4] lg:w-auto rounded-xl overflow-hidden group cursor-pointer text-left shadow-[0_4px_14px_rgba(22,138,211,0.12)]"
    >
      <ReelMedia reel={reel} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/75 to-transparent" />
      <span className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white">
        <Play className="w-3.5 h-3.5" fill="#fff" />
      </span>
      <span className="absolute inset-x-0 bottom-3 text-center text-white font-bold text-[14px] lg:text-lg [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
        {reel.title}
      </span>
    </button>
  )
}

// Story-style viewer: each reel is short and moves on by itself; tap the sides to skip
function ReelViewer({ reels, start, onClose }) {
  const [index, setIndex] = useState(start)
  const reel = reels[index]
  const last = index === reels.length - 1

  const next = useCallback(() => (last ? onClose() : setIndex((i) => i + 1)), [last, onClose])
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [next, prev, onClose])

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center" role="dialog" aria-modal="true" aria-label={reel.title}>
      <div className="relative w-full h-full md:h-[92vh] md:w-auto md:aspect-[9/16] md:rounded-2xl overflow-hidden bg-black">
        <ReelMedia key={reel.id} reel={reel} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />

        {/* Progress bars, one per reel */}
        <div className="absolute top-3 inset-x-3 flex gap-1.5">
          {reels.map((r, i) => (
            <span key={r.id} className="h-[3px] flex-1 rounded-full bg-white/35 overflow-hidden">
              <span
                key={i === index ? `run-${index}` : `static-${i}`}
                className="block h-full bg-white origin-left"
                style={i === index
                  ? { animation: `reel-progress ${reel.duration}s linear forwards` }
                  : { transform: `scaleX(${i < index ? 1 : 0})` }}
                onAnimationEnd={i === index ? next : undefined}
              />
            </span>
          ))}
        </div>

        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-7 right-3 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        {/* Tap zones */}
        <button type="button" onClick={prev} aria-label="Previous reel" className="absolute left-0 top-16 bottom-40 w-1/3 cursor-pointer" />
        <button type="button" onClick={next} aria-label="Next reel" className="absolute right-0 top-16 bottom-40 w-1/3 cursor-pointer" />

        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h3 className="font-serif-display text-2xl font-bold">{reel.title}</h3>
          <p className="text-sm text-white/80 mt-0.5">{reel.villa} · {reel.city}</p>
          <div className="flex items-center justify-between mt-3">
            <p className="text-lg font-bold">{formatPrice(reel.price)} <span className="text-xs font-normal text-white/75">/ night</span></p>
            <Link to={`/villas/${reel.villaId}`} className="px-5 py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: C.primary }}>
              View villa
            </Link>
          </div>
        </div>
      </div>

      <style>{'@keyframes reel-progress { from { transform: scaleX(0) } to { transform: scaleX(1) } }'}</style>
    </div>
  )
}

export default function Reels({ reels }) {
  const [open, setOpen] = useState(null)
  const close = useCallback(() => setOpen(null), [])
  return (
    <>
      <Rail cols="lg:grid-cols-6">
        {reels.map((r, i) => <ReelCard key={r.id} reel={r} onOpen={() => setOpen(i)} />)}
      </Rail>
      {open !== null && <ReelViewer reels={reels} start={open} onClose={close} />}
    </>
  )
}
