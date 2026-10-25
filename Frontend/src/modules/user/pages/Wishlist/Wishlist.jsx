import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import api from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'
import { useWishlist } from '@/core/wishlist/wishlist.store.js'
import { HomeNavbar, BottomNav } from '../../components/home/HomeNav.jsx'
import { C, HeartButton } from '../../components/home/homeUi.jsx'
import { RowCard } from '../../components/home/VillaCards.jsx'

// Villas the guest saved. Un-hearting one removes it from the list straight away.
export default function Wishlist() {
  const [items, setItems] = useState(null)
  const ids = useWishlist((s) => s.ids)

  useEffect(() => {
    let alive = true
    api.get('/user/wishlist')
      .then((res) => alive && setItems(res.data.data.items.map((v) => ({ ...v, image: assetUrl(v.image) }))))
      .catch(() => alive && setItems([]))
    return () => { alive = false }
  }, [])

  const shown = (items || []).filter((v) => ids.includes(v.id))

  return (
    <div className="min-h-screen pb-24 md:pb-0 antialiased" style={{ background: C.cream, color: C.ink }}>
      <HomeNavbar />
      <main className="max-w-[1360px] mx-auto px-4 md:px-6 lg:px-10 pt-6 md:pt-10">
        <h1 className="font-serif-display text-2xl lg:text-4xl font-bold">My Favourites</h1>
        {items && <p className="text-sm mt-1" style={{ color: C.muted }}>{shown.length} saved {shown.length === 1 ? 'villa' : 'villas'}</p>}

        {items === null ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-3 animate-pulse">
            {[0, 1, 2].map((i) => <div key={i} className="h-[128px] rounded-2xl bg-[#DDF3FF]" />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <span className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: C.peach, color: C.primaryDark }}><Heart className="w-7 h-7" /></span>
            <h2 className="font-serif-display text-xl font-bold mt-4">No favourites yet</h2>
            <p className="text-sm mt-1 max-w-xs" style={{ color: C.muted }}>Tap the heart on a villa to keep it here for later.</p>
            <Link to="/" className="mt-5 rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ background: C.primary }}>Explore villas</Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {shown.map((v) => (
              <div key={v.id} className="relative">
                <RowCard villa={v} />
                <HeartButton id={v.id} className="absolute top-3 right-3 !bg-[#168AD3]/90 hover:!bg-[#168AD3]" />
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
