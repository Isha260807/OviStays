import { useState, useEffect } from 'react'
import api from '@/services/api/axios.js'

export const DEFAULT_AUTH_ASSETS = {
  welcomeTravelerImage: '/assets/auth/traveler_hero.png',
  welcomeCard1: '/assets/auth/card_beach.jpg',
  welcomeCard2: '/assets/auth/card_pool.jpg',
  welcomeCard3: '/assets/auth/card_patio.jpg',
  authHeroBanner: '/assets/auth/hotel_hero.jpg',
  tagText: '#Luxury',
  welcomeTitle: 'Find your perfect stay anywhere in the world',
  welcomeSubtitle: 'Find and reserve exceptional stays worldwide with a seamless and reliable booking experience.',
  authTagline: 'Your Perfect Stay Awaits.',
  authSubtagline: 'Book the best hotels and enjoy comfortable stays at great prices.',
}

let cachedAssets = null

export function useAuthAssets() {
  const [assets, setAssets] = useState(cachedAssets || DEFAULT_AUTH_ASSETS)
  const [loading, setLoading] = useState(!cachedAssets)

  useEffect(() => {
    let isMounted = true

    async function fetchAssets() {
      try {
        const response = await api.get('/user/auth/config')
        if (response.data?.success && response.data?.data) {
          const merged = { ...DEFAULT_AUTH_ASSETS, ...response.data.data }
          cachedAssets = merged
          if (isMounted) setAssets(merged)
        }
      } catch (err) {
        // Graceful fallback to default bundled assets
        console.warn('Using default auth assets:', err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (!cachedAssets) {
      fetchAssets()
    } else {
      setLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [])

  return { assets, loading }
}
