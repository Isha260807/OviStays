import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import api from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'
import { EmptyState, ErrorNote, PageShell, Skeletons } from '../../components/common/PageParts.jsx'
import { formatPrice } from '../../data/homeData.js'

// Every city that has villas. Tapping one opens the villa list for that city.
export default function Destinations() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    api.get('/user/destinations')
      .then((res) => alive && setItems(res.data.data))
      .catch(() => alive && setError(true))
    return () => { alive = false }
  }, [])

  return (
    <PageShell title="Destinations" subtitle="Pick a place and see the villas waiting there">
      {error ? <ErrorNote /> : items === null ? (
        <Skeletons count={6} className="h-[220px]" grid="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
      ) : items.length === 0 ? (
        <EmptyState icon={MapPin} title="No destinations yet" text="Villas will show up here as soon as they are listed." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((d) => (
            <Link key={d.city} to={`/villas?city=${encodeURIComponent(d.city)}`} className="group relative block h-[220px] lg:h-[260px] rounded-2xl overflow-hidden bg-[#DDF3FF]">
              {d.image && <img src={assetUrl(d.image)} alt={d.city} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <h2 className="font-serif-display text-2xl font-bold leading-tight">{d.city}</h2>
                <p className="text-xs text-white/80">{d.state ? `${d.state} · ` : ''}{d.count} {d.count === 1 ? 'villa' : 'villas'}</p>
                {d.price > 0 && <p className="text-sm mt-1.5">from <span className="font-bold">{formatPrice(d.price)}</span> <span className="text-xs text-white/75">/ night</span></p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  )
}
