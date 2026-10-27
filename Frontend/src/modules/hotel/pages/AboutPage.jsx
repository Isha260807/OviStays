import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { assetUrl } from '@/services/api/config.js'
import { useAsync } from '../components/useAsync.js'
import { Card, ErrorBox, Spinner } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'

// Written by the admin in Admin > Pages & Social Media > About Us
export default function AboutPage() {
  const { data: a, error, loading, reload } = useAsync(() => ownerAPI.about(), [])

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/hotel/profile" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700"><ChevronLeft className="h-4 w-4" /> Profile</Link>
      <h1 className="text-2xl font-bold text-slate-900">About OviStays</h1>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !a && <Spinner />}
      {a && (
        <>
          <Card>
            <div className="flex items-center gap-4">
              {a.logo && <img src={assetUrl(a.logo)} alt="" className="h-14 w-14 rounded-xl object-cover" />}
              <div>
                <p className="text-lg font-bold text-slate-900">{a.appName}</p>
                <p className="text-xs text-slate-500">Version {a.version}</p>
              </div>
            </div>
            {a.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{a.description}</p>}
          </Card>
          {a.features.length > 0 && (
            <Card title="What we stand for">
              <ul className="space-y-3">
                {a.features.map((f, i) => (
                  <li key={i}>
                    <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                    {f.description && <p className="text-sm text-slate-600">{f.description}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
