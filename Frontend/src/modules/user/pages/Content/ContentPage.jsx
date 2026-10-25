import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import api from '@/services/api/axios.js'
import { HomeNavbar, BottomNav } from '../../components/home/HomeNav.jsx'
import { C } from '../../components/home/homeUi.jsx'

const ALLOWED = ['terms', 'privacy', 'refund', 'cancellation']

// Terms, privacy, refund and cancellation text written in Admin > Pages & Social Media.
// The server escapes the text before turning it into HTML, so it is safe to render as is.
export default function ContentPage() {
  const { key } = useParams()
  const navigate = useNavigate()
  const [page, setPage] = useState(null)
  const [missing, setMissing] = useState(!ALLOWED.includes(key))

  useEffect(() => {
    if (!ALLOWED.includes(key)) return
    let alive = true
    setPage(null)
    setMissing(false)
    api.get(`/pages/${key}`)
      .then((res) => alive && setPage(res.data.data))
      .catch(() => alive && setMissing(true))
    return () => { alive = false }
  }, [key])

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/profile'))

  return (
    <div className="min-h-screen pb-24 md:pb-0 antialiased" style={{ background: C.cream, color: C.ink }}>
      <HomeNavbar />
      <main className="max-w-[860px] mx-auto px-4 md:px-6 pt-5 md:pt-10">
        <button type="button" onClick={back} className="inline-flex items-center gap-1 text-sm font-semibold cursor-pointer" style={{ color: C.primaryDark }}>
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {missing ? (
          <div className="py-20 text-center">
            <h1 className="font-serif-display text-2xl font-bold">Page not found</h1>
            <Link to="/profile" className="inline-block mt-5 rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ background: C.primary }}>Back to Profile</Link>
          </div>
        ) : !page ? (
          <div className="mt-6 space-y-3 animate-pulse">
            <div className="h-8 w-1/2 rounded bg-[#DDF3FF]" />
            <div className="h-4 rounded bg-[#DDF3FF]" />
            <div className="h-4 w-5/6 rounded bg-[#DDF3FF]" />
          </div>
        ) : (
          <article className="mt-4 bg-white rounded-2xl border p-5 md:p-8 shadow-[0_6px_20px_rgba(22,138,211,0.06)]" style={{ borderColor: '#E2EDF5' }}>
            <h1 className="font-serif-display text-2xl lg:text-3xl font-bold mb-4">{page.title}</h1>
            {page.html ? (
              <div className="legal-preview text-sm lg:text-base" dangerouslySetInnerHTML={{ __html: page.html }} />
            ) : (
              <p className="text-sm" style={{ color: C.muted }}>This page has not been written yet.</p>
            )}
          </article>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
