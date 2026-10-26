import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, Tag } from 'lucide-react'
import api from '@/services/api/axios.js'
import { assetUrl } from '@/services/api/config.js'
import { C } from '../../components/home/homeUi.jsx'
import { EmptyState, ErrorNote, PageShell, Skeletons } from '../../components/common/PageParts.jsx'
import { shortDate } from '../../utils/format.js'

function CouponCard({ coupon }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked: the code is still on screen to copy by hand
    }
  }
  return (
    <div className="flex bg-white rounded-2xl border overflow-hidden shadow-[0_6px_20px_rgba(22,138,211,0.08)]" style={{ borderColor: '#E2EDF5' }}>
      <div className="flex w-28 shrink-0 flex-col items-center justify-center px-3 py-5 text-center text-white" style={{ background: C.primaryDark }}>
        <Tag className="w-5 h-5 mb-1.5" />
        <span className="font-serif-display text-lg font-bold leading-tight">{coupon.text}</span>
      </div>
      <div className="flex-1 min-w-0 p-4">
        <p className="text-xs" style={{ color: C.muted }}>Use code</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-lg border border-dashed px-3 py-1.5 font-mono text-base font-bold tracking-wider" style={{ borderColor: C.primary, color: C.primaryDark }}>{coupon.code}</span>
          <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer" style={{ background: C.peach, color: C.primaryDark }}>
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
        </div>
        <p className="text-[11px] mt-2.5" style={{ color: C.muted }}>Valid till {shortDate(coupon.validTill)}</p>
      </div>
    </div>
  )
}

export default function Offers() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    api.get('/user/offers')
      .then((res) => alive && setData(res.data.data))
      .catch(() => alive && setError(true))
    return () => { alive = false }
  }, [])

  const empty = data && !data.coupons.length && !data.banners.length

  return (
    <PageShell title="Offers & coupons" subtitle="Save more on your next stay">
      {error ? <ErrorNote /> : data === null ? (
        <Skeletons count={3} className="h-[120px]" />
      ) : empty ? (
        <EmptyState icon={Tag} title="No offers right now" text="Check back soon, new deals land here often." actionLabel="Explore villas" actionTo="/villas" />
      ) : (
        <>
          {data.banners.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 mb-8">
              {data.banners.map((b) => (
                <Link key={b.id} to="/villas" className="relative block h-[160px] lg:h-[220px] rounded-2xl overflow-hidden bg-[#DDF3FF]">
                  <img src={assetUrl(b.image)} alt={b.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" />
                  <p className="absolute left-5 bottom-5 font-serif-display text-2xl font-bold text-white max-w-[70%]">{b.title}</p>
                </Link>
              ))}
            </div>
          )}
          {data.coupons.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.coupons.map((c) => <CouponCard key={c.id} coupon={c} />)}
            </div>
          )}
        </>
      )}
    </PageShell>
  )
}
