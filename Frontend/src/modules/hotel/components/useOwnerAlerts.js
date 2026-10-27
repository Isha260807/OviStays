import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ownerAPI } from '../services/ownerAPI.js'

// Tells the owner the moment something new arrives (a booking request, a payment, a cancellation):
// a chime, a pop-up with a link, a phone vibration and the count in the browser tab's title.
// The page asks the server every few seconds; nothing needs to be installed or allowed for the basics.

const EVERY_MS = 15000
const SOUND_KEY = 'ovistays-owner-sound'

export const soundEnabled = () => {
  try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch { return true }
}

let audio = null
// Browsers only allow sound after the person has touched the page once, so the audio engine is started on first tap
function unlock() {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)()
    if (audio.state === 'suspended') audio.resume()
  } catch { /* no audio support: the pop-up and vibration still work */ }
}
if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, unlock, { once: false, passive: true })
}

// A short two-note chime made in the browser, so no sound file is needed
export function playChime() {
  if (!soundEnabled() || !audio || audio.state !== 'running') return false
  const now = audio.currentTime
  ;[[880, 0], [1175, 0.16], [1568, 0.32]].forEach(([freq, at]) => {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, now + at)
    gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.3)
    osc.connect(gain).connect(audio.destination)
    osc.start(now + at)
    osc.stop(now + at + 0.32)
  })
  return true
}

export function useOwnerAlerts({ enabled, verified, navigate, onCounts }) {
  const known = useRef(null) // ids already seen; null until the first look, so opening the app does not ring
  const [sound, setSoundState] = useState(soundEnabled)
  const baseTitle = useRef(typeof document !== 'undefined' ? document.title : 'OviStays')

  const setSound = useCallback((on) => {
    try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off') } catch { /* private mode: keep it for this visit only */ }
    setSoundState(on)
    if (on) { unlock(); setTimeout(playChime, 50) }
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    let alive = true

    const look = async () => {
      try {
        const [list, pending] = await Promise.all([
          ownerAPI.notifications({ page: 1 }),
          verified ? ownerAPI.bookings({ tab: 'pending', limit: 1 }) : Promise.resolve({ pendingRequests: 0 }),
        ])
        if (!alive) return
        onCounts?.({ unread: list.unread, pending: pending.pendingRequests })
        document.title = list.unread > 0 ? `(${list.unread}) ${baseTitle.current}` : baseTitle.current

        const fresh = list.items.filter((n) => !n.read)
        if (known.current === null) { known.current = new Set(list.items.map((n) => n.id)); return }
        const added = fresh.filter((n) => !known.current.has(n.id))
        list.items.forEach((n) => known.current.add(n.id))
        if (!added.length) return

        playChime()
        navigator.vibrate?.([200, 100, 200])
        for (const n of added.slice(0, 3)) {
          toast(n.title, {
            description: n.message,
            duration: 12000,
            action: n.link?.startsWith('/hotel') ? { label: 'View', onClick: () => navigate(n.link) } : undefined,
          })
        }
        if (added.length > 3) toast(`${added.length - 3} more updates`, { action: { label: 'Open', onClick: () => navigate('/hotel/notifications') } })
      } catch { /* a missed look is retried on the next tick */ }
    }

    look()
    const timer = setInterval(look, EVERY_MS)
    const onShow = () => document.visibilityState === 'visible' && look()
    document.addEventListener('visibilitychange', onShow)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onShow)
      document.title = baseTitle.current
    }
  }, [enabled, verified, navigate, onCounts])

  return { sound, setSound }
}
