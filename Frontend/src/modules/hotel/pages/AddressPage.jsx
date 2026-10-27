import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/services/api/axios.js'
import { useAsync } from '../components/useAsync.js'
import { Btn, Card, ErrorBox, Field, Input, Spinner } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'

export default function AddressPage() {
  const { data: p, error, loading, reload } = useAsync(() => ownerAPI.profile(), [])
  const [a, setA] = useState({ line: '', city: '', state: '', pincode: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (p) setA(p.address) }, [p])

  if (loading && !p) return <Spinner />
  if (error) return <ErrorBox message={error} onRetry={reload} />

  const set = (k) => (e) => setA((x) => ({ ...x, [k]: e.target.value }))
  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await ownerAPI.saveProfile({ address: a })
      toast.success('Address saved')
      reload()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/hotel/profile" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700"><ChevronLeft className="h-4 w-4" /> Profile</Link>
      <h1 className="text-2xl font-bold text-slate-900">Manage address</h1>
      <p className="text-sm text-slate-500">Your own or your business address. It is used for invoices and payout paperwork. Each villa's address is set separately on the villa.</p>
      <Card>
        <form onSubmit={save} className="space-y-4">
          <Field label="Address"><Input value={a.line} onChange={set('line')} maxLength={200} placeholder="House / building, street, area" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City"><Input value={a.city} onChange={set('city')} maxLength={60} /></Field>
            <Field label="State"><Input value={a.state} onChange={set('state')} maxLength={60} /></Field>
            <Field label="Pincode"><Input value={a.pincode} onChange={set('pincode')} inputMode="numeric" maxLength={10} /></Field>
          </div>
          <Btn type="submit" loading={busy}>Save address</Btn>
        </form>
      </Card>
    </div>
  )
}
