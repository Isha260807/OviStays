import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BedDouble, CalendarDays, MapPin, Search, SlidersHorizontal, Star, Users, X } from 'lucide-react'
import api from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'
import { C, HeartButton } from '../../components/home/homeUi.jsx'
import { EmptyState, ErrorNote, PageShell, Skeletons } from '../../components/common/PageParts.jsx'
import { formatPrice } from '../../data/homeData.js'
import { todayYmd } from '../../utils/format.js'

const SORTS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest' },
]
const FILTER_KEYS = ['state', 'city', 'type', 'minPrice', 'maxPrice', 'rating', 'bedrooms', 'amenities']
const border = { borderColor: '#E2EDF5' }
const fieldCls = 'w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#55B8F5]/40 focus:border-[#55B8F5]'

function VillaListCard({ villa }) {
  const specs = [
    villa.bedrooms && `${villa.bedrooms} bed${villa.bedrooms > 1 ? 's' : ''}`,
    villa.bathrooms && `${villa.bathrooms} bath${villa.bathrooms > 1 ? 's' : ''}`,
    villa.maxGuests && `${villa.maxGuests} guests`,
  ].filter(Boolean)
  return (
    <Link to={`/villas/${villa.id}`} className="group block bg-white rounded-2xl overflow-hidden border shadow-[0_6px_20px_rgba(22,138,211,0.08)] hover:shadow-[0_10px_28px_rgba(22,138,211,0.16)] transition-shadow" style={border}>
      <div className="relative aspect-[2/1] sm:aspect-[4/3] overflow-hidden bg-[#DDF3FF]">
        {villa.image && <img src={assetUrl(villa.image)} alt={villa.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
        <HeartButton id={villa.id} className="absolute top-2 right-2 sm:top-3 sm:right-3 !bg-black/30 hover:!bg-black/45" />
        <span className="absolute left-2 top-2 sm:left-3 sm:top-3 rounded-full bg-white/90 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold" style={{ color: C.primaryDark }}>{villa.propertyType}</span>
      </div>
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif-display text-base sm:text-lg font-semibold leading-tight">{villa.name}</h3>
          {villa.rating > 0 && (
            <span className="flex items-center gap-1 text-sm font-semibold shrink-0"><Star className="w-4 h-4" fill="#F5A524" stroke="#F5A524" />{villa.rating}</span>
          )}
        </div>
        <p className="flex items-center gap-1 text-xs mt-1" style={{ color: C.muted }}><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{villa.location}</span></p>
        {specs.length > 0 && <p className="text-xs mt-1.5 sm:mt-2.5" style={{ color: C.muted }}>{specs.join(' · ')}</p>}
        <p className="mt-1.5 sm:mt-3 text-lg sm:text-xl font-bold" style={{ color: C.primaryDark }}>
          {villa.price ? formatPrice(villa.price) : 'Price on request'}
          {villa.price > 0 && <span className="text-xs font-normal ml-1" style={{ color: C.muted }}>/ night</span>}
        </p>
      </div>
    </Link>
  )
}

// The search box with city / villa suggestions
function SearchBox({ value, onChange, onPick, onSubmit }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState([])
  const box = useRef(null)

  useEffect(() => {
    const q = value.trim()
    if (q.length < 2) { setOptions([]); return }
    let alive = true
    const timer = setTimeout(() => {
      api.get('/user/search/suggestions', { params: { q } })
        .then((res) => alive && setOptions(res.data.data))
        .catch(() => {})
    }, 250)
    return () => { alive = false; clearTimeout(timer) }
  }, [value])

  useEffect(() => {
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={box} className="relative flex-1 min-w-0">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.muted }} />
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter') { setOpen(false); onSubmit() } }}
        placeholder="Search villas, cities or places"
        className={`${fieldCls} pl-10`}
        style={border}
        aria-label="Search villas"
      />
      {open && options.length > 0 && (
        <ul className="absolute z-30 mt-1.5 w-full rounded-2xl border bg-white shadow-[0_12px_32px_rgba(22,138,211,0.18)] overflow-hidden" style={border}>
          {options.map((o) => (
            <li key={`${o.type}-${o.id || o.value}`}>
              <button type="button" onClick={() => { setOpen(false); onPick(o) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F5FAFE] cursor-pointer">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: C.primaryDark }} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold truncate">{o.label}</span>
                  <span className="block text-xs truncate" style={{ color: C.muted }}>{o.type === 'city' ? `City · ${o.sub}` : `Villa · ${o.sub}`}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Filter sheet: bottom sheet on phones, side panel from md up
function FilterSheet({ open, onClose, meta, params, onApply }) {
  const [draft, setDraft] = useState({})
  useEffect(() => {
    if (open) setDraft(Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])))
  }, [open, params])

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }))
  const picked = new Set((draft.amenities || '').split(',').filter(Boolean))
  const toggleAmenity = (id) => {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setDraft((d) => ({ ...d, amenities: [...next].join(',') }))
  }
  const optionBtn = (active) => `rounded-full border px-3.5 py-1.5 text-sm font-medium cursor-pointer ${active ? 'text-white border-transparent' : 'bg-white'}`

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 inset-x-0 md:inset-x-auto md:right-0 md:top-0 md:w-[400px] max-h-[88vh] md:max-h-none rounded-t-3xl md:rounded-none bg-white flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={border}>
          <h2 className="font-serif-display text-xl font-bold">Filters</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer" style={border}><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {meta?.states?.length > 0 && (
            <section>
              <h3 className="text-sm font-bold mb-2">State</h3>
              <select value={draft.state || ''} onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value, city: '' }))} className={fieldCls} style={border}>
                <option value="">All states</option>
                {meta.states.map((x) => <option key={x.state} value={x.state}>{x.state} ({x.count})</option>)}
              </select>
            </section>
          )}

          {meta?.cities?.length > 0 && (
            <section>
              <h3 className="text-sm font-bold mb-2">City</h3>
              <select value={draft.city || ''} onChange={set('city')} className={fieldCls} style={border}>
                <option value="">All cities</option>
                {meta.cities.filter((c) => !draft.state || c.state === draft.state).map((c) => <option key={`${c.state}-${c.city}`} value={c.city}>{c.city} ({c.count})</option>)}
              </select>
            </section>
          )}

          <section>
            <h3 className="text-sm font-bold mb-2">Price per night</h3>
            <div className="flex items-center gap-3">
              <input type="number" min="0" inputMode="numeric" placeholder={meta?.price?.min ? `Min ${meta.price.min}` : 'Min'} value={draft.minPrice || ''} onChange={set('minPrice')} className={fieldCls} style={border} />
              <span style={{ color: C.muted }}>to</span>
              <input type="number" min="0" inputMode="numeric" placeholder={meta?.price?.max ? `Max ${meta.price.max}` : 'Max'} value={draft.maxPrice || ''} onChange={set('maxPrice')} className={fieldCls} style={border} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold mb-2">Rating</h3>
            <div className="flex flex-wrap gap-2">
              {['', '3', '4', '4.5'].map((r) => (
                <button key={r || 'any'} type="button" onClick={() => setDraft((d) => ({ ...d, rating: r }))} className={optionBtn((draft.rating || '') === r)} style={(draft.rating || '') === r ? { background: C.primaryDark } : border}>
                  {r ? `${r}+ ★` : 'Any'}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold mb-2">Bedrooms</h3>
            <div className="flex flex-wrap gap-2">
              {['', '1', '2', '3', '4', '5'].map((b) => (
                <button key={b || 'any'} type="button" onClick={() => setDraft((d) => ({ ...d, bedrooms: b }))} className={optionBtn((draft.bedrooms || '') === b)} style={(draft.bedrooms || '') === b ? { background: C.primaryDark } : border}>
                  {b ? `${b}+` : 'Any'}
                </button>
              ))}
            </div>
          </section>

          {meta?.propertyTypes?.length > 1 && (
            <section>
              <h3 className="text-sm font-bold mb-2">Property type</h3>
              <div className="flex flex-wrap gap-2">
                {['', ...meta.propertyTypes].map((t) => {
                  const active = (draft.type || '').toLowerCase() === t.toLowerCase().replace(/\s+/g, '-') || (draft.type || '') === t
                  return (
                    <button key={t || 'any'} type="button" onClick={() => setDraft((d) => ({ ...d, type: t }))} className={optionBtn(active)} style={active ? { background: C.primaryDark } : border}>{t || 'Any'}</button>
                  )
                })}
              </div>
            </section>
          )}

          {meta?.amenities?.length > 0 && (
            <section>
              <h3 className="text-sm font-bold mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {meta.amenities.map((a) => (
                  <button key={a.id} type="button" onClick={() => toggleAmenity(a.id)} className={optionBtn(picked.has(a.id))} style={picked.has(a.id) ? { background: C.primaryDark } : border}>{a.name}</button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t" style={border}>
          <button type="button" onClick={() => onApply(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])))} className="rounded-full border px-6 py-2.5 text-sm font-semibold cursor-pointer" style={border}>Clear all</button>
          <button type="button" onClick={() => onApply(draft)} className="flex-1 rounded-full px-6 py-2.5 text-sm font-semibold text-white cursor-pointer" style={{ background: C.primary }}>Show villas</button>
        </div>
      </div>
    </div>
  )
}

// Everything is kept in the URL, so a search can be shared and the back button works
export default function VillaSearch() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [meta, setMeta] = useState(null)
  const [items, setItems] = useState(null)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [q, setQ] = useState(params.get('q') || '')

  // Query without the page number: a change here starts a new search
  const queryKey = useMemo(() => {
    const p = new URLSearchParams(params)
    p.delete('page')
    p.sort()
    return p.toString()
  }, [params])

  useEffect(() => { setQ(params.get('q') || '') }, [queryKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.get('/user/villas/filters').then((res) => setMeta(res.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    setItems(null)
    setError(false)
    setPage(1)
    api.get('/user/villas', { params: Object.fromEntries(new URLSearchParams(queryKey)) })
      .then((res) => {
        if (!alive) return
        setItems(res.data.data.items)
        setTotal(res.data.data.total)
        setPages(res.data.data.pages)
      })
      .catch(() => alive && setError(true))
    return () => { alive = false }
  }, [queryKey])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const res = await api.get('/user/villas', { params: { ...Object.fromEntries(new URLSearchParams(queryKey)), page: page + 1 } })
      setItems((prev) => [...prev, ...res.data.data.items])
      setPage(page + 1)
    } catch {
      setError(true)
    } finally {
      setLoadingMore(false)
    }
  }

  const update = (changes) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    next.delete('page')
    setParams(next)
  }

  const get = (k) => params.get(k) || ''
  const activeFilters = FILTER_KEYS.filter((k) => get(k)).length
  const chips = [
    get('state') && { key: 'state', label: get('state') },
    get('city') && { key: 'city', label: get('city') },
    get('type') && { key: 'type', label: get('type').replace(/-/g, ' ') },
    (get('minPrice') || get('maxPrice')) && { key: 'price', label: `₹${get('minPrice') || 0} - ${get('maxPrice') ? `₹${get('maxPrice')}` : 'any'}`, clear: ['minPrice', 'maxPrice'] },
    get('rating') && { key: 'rating', label: `${get('rating')}+ rating` },
    get('bedrooms') && { key: 'bedrooms', label: `${get('bedrooms')}+ bedrooms` },
    get('amenities') && { key: 'amenities', label: `${get('amenities').split(',').length} amenities` },
    get('checkIn') && get('checkOut') && { key: 'dates', label: `${get('checkIn')} → ${get('checkOut')}`, clear: ['checkIn', 'checkOut'] },
  ].filter(Boolean)

  const pickSuggestion = (o) => {
    if (o.type === 'villa') navigate(`/villas/${o.id}`)
    else update({ q: '', city: o.value })
  }

  return (
    <PageShell title="Find your villa" subtitle={items ? `${total} ${total === 1 ? 'villa' : 'villas'} found` : 'Searching...'}>
      <div className="flex flex-col md:flex-row gap-3">
        <SearchBox value={q} onChange={setQ} onPick={pickSuggestion} onSubmit={() => update({ q: q.trim() })} />
        <div className="grid grid-cols-2 md:flex gap-3">
          <label className="relative block">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: C.muted }} />
            <input type="date" min={todayYmd()} value={get('checkIn')} onChange={(e) => update({ checkIn: e.target.value, checkOut: get('checkOut') <= e.target.value ? '' : get('checkOut') })} className={`${fieldCls} pl-9`} style={border} aria-label="Check-in" />
          </label>
          <label className="relative block">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: C.muted }} />
            <input type="date" min={get('checkIn') || todayYmd()} value={get('checkOut')} onChange={(e) => update({ checkOut: e.target.value })} className={`${fieldCls} pl-9`} style={border} aria-label="Check-out" />
          </label>
        </div>
        <label className="relative block md:w-36">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: C.muted }} />
          <select value={get('guests')} onChange={(e) => update({ guests: e.target.value })} className={`${fieldCls} pl-9`} style={border} aria-label="Guests">
            <option value="">Guests</option>
            {[1, 2, 4, 6, 8, 10, 15, 20].map((n) => <option key={n} value={n}>{n}+ guests</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold cursor-pointer" style={border}>
          <SlidersHorizontal className="w-4 h-4" /> Filters{activeFilters ? ` (${activeFilters})` : ''}
        </button>
        {chips.map((c) => (
          <button key={c.key} type="button" onClick={() => update(Object.fromEntries((c.clear || [c.key]).map((k) => [k, ''])))} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer" style={{ background: C.peach, color: C.primaryDark }}>
            {c.label} <X className="w-3 h-3" />
          </button>
        ))}
        {get('q') && (
          <button type="button" onClick={() => update({ q: '' })} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer" style={{ background: C.peach, color: C.primaryDark }}>
            “{get('q')}” <X className="w-3 h-3" />
          </button>
        )}
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="hidden sm:inline" style={{ color: C.muted }}>Sort by</span>
          <select value={get('sort') || 'popular'} onChange={(e) => update({ sort: e.target.value === 'popular' ? '' : e.target.value })} className="rounded-full border bg-white px-3 py-2 text-sm font-semibold outline-none cursor-pointer" style={border}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-6">
        {error && !items ? (
          <ErrorNote />
        ) : items === null ? (
          <Skeletons count={6} className="h-[340px]" grid="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
        ) : items.length === 0 ? (
          <EmptyState icon={BedDouble} title="No villas found" text="Try different dates, fewer filters or another place." actionLabel="Clear search" actionTo="/villas" />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((v) => <VillaListCard key={v.id} villa={v} />)}
            </div>
            {page < pages && (
              <div className="mt-8 text-center">
                <button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-full border bg-white px-8 py-2.5 text-sm font-semibold disabled:opacity-50 cursor-pointer" style={border}>
                  {loadingMore ? 'Loading...' : 'Show more villas'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} meta={meta} params={params} onApply={(changes) => { setFiltersOpen(false); update(changes) }} />
    </PageShell>
  )
}
