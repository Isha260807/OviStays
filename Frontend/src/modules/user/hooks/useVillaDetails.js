import { useEffect, useState } from 'react'
import api from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'

function resolveAssets(v) {
  return {
    ...v,
    video: v.video ? assetUrl(v.video) : '',
    photos: (v.photos || []).map((p) => ({ ...p, url: assetUrl(p.url) })),
    spaces: (v.spaces || []).map((s) => ({ ...s, image: s.image ? assetUrl(s.image) : '' })),
  }
}

// One villa for the details page: { villa, loading, notFound }
export function useVillaDetails(id) {
  const [state, setState] = useState({ villa: null, loading: true, notFound: false })

  useEffect(() => {
    let alive = true
    setState({ villa: null, loading: true, notFound: false })
    api.get(`/user/villas/${id}`)
      .then((res) => {
        if (alive) setState({ villa: resolveAssets(res.data.data), loading: false, notFound: false })
      })
      .catch((err) => {
        if (alive) setState({ villa: null, loading: false, notFound: err.response?.status === 404 })
      })
    return () => { alive = false }
  }, [id])

  return state
}
