import { useEffect, useState } from 'react'
import api from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'

// Uploaded files come back as relative /uploads paths; make them loadable from the browser.
const withUrl = (item, fields) => {
  const out = { ...item }
  for (const f of fields) if (out[f]) out[f] = assetUrl(out[f])
  return out
}

function resolveAssets(data) {
  const sections = (data.sections || []).map((s) => {
    const next = { ...s }
    if (s.items) next.items = s.items.map((i) => withUrl(i, ['image']))
    if (s.offer) next.offer = withUrl(s.offer, ['image'])
    if (s.promos) next.promos = s.promos.map((p) => withUrl(p, ['image']))
    if (s.tiles) next.tiles = s.tiles.map((t) => withUrl(t, ['image']))
    if (s.reels) next.reels = s.reels.map((r) => withUrl(r, ['image', 'video']))
    if (s.categories) next.categories = s.categories.map((c) => withUrl(c, ['image']))
    return next
  })
  return { hero: withUrl(data.hero || {}, ['image']), sections }
}

// The last Home page that was loaded, kept for the whole visit. Coming back to Home shows it at once while a fresh
// copy is fetched in the background, so the page is never blank after the first time.
let cached = null

// The Home page layout and content, managed from Admin > Home Management > Home Page Design.
export function useHomeData() {
  const [data, setData] = useState(cached)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    let alive = true
    api.get('/user/home')
      .then((res) => {
        if (res.data?.success) {
          cached = resolveAssets(res.data.data)
          if (alive) setData(cached)
        }
      })
      .catch((err) => console.warn('Could not load the home page:', err.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  return { data, loading }
}
