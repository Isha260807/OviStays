import { useEffect, useState } from 'react'
import api from '@/services/api/axios.js'
import { C } from '../../components/home/homeUi.jsx'
import { AccountShell, Field, Notice, card, cardBorder, errorText, inputCls, primaryBtn } from '../../components/account/AccountUi.jsx'

const ID_TYPES = ['Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'PAN']
const EMPTY = { business: { companyName: '', gstin: '', address: '' }, idProof: { type: '', last4: '', holderName: '' } }

// GST details for invoices and the ID the guest usually carries to check-in
export default function BillingId() {
  const [form, setForm] = useState(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    api.get('/user/profile/billing')
      .then((res) => setForm(res.data.data))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const set = (group, key) => (e) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: e.target.value } }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const res = await api.put('/user/profile/billing', form)
      setForm(res.data.data)
      setMessage({ ok: true, text: 'Details saved' })
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccountShell title="Billing & ID">
      <form onSubmit={submit} className="space-y-6">
        <section className={`${card} p-5 space-y-4`} style={cardBorder}>
          <div>
            <h2 className="text-base font-bold">GST details</h2>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>Add these if you want a GST invoice for business travel.</p>
          </div>
          <Field label="Company name">
            <input className={inputCls} style={cardBorder} value={form.business.companyName} onChange={set('business', 'companyName')} maxLength={100} />
          </Field>
          <Field label="GSTIN" hint="15 characters, for example 27AAPFU0939F1ZV">
            <input className={`${inputCls} uppercase`} style={cardBorder} value={form.business.gstin} onChange={set('business', 'gstin')} maxLength={15} autoComplete="off" />
          </Field>
          <Field label="Billing address">
            <textarea className={`${inputCls} min-h-[84px] resize-y`} style={cardBorder} value={form.business.address} onChange={set('business', 'address')} maxLength={250} />
          </Field>
        </section>

        <section className={`${card} p-5 space-y-4`} style={cardBorder}>
          <div>
            <h2 className="text-base font-bold">ID proof</h2>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>Villas ask for a government ID at check-in. For your safety we keep only the type and the last 4 characters.</p>
          </div>
          <Field label="ID type">
            <select className={inputCls} style={cardBorder} value={form.idProof.type} onChange={set('idProof', 'type')}>
              <option value="">Not added</option>
              {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          {form.idProof.type && (
            <>
              <Field label="Last 4 characters of the ID number">
                <input className={`${inputCls} uppercase tracking-widest`} style={cardBorder} value={form.idProof.last4} onChange={set('idProof', 'last4')} maxLength={4} autoComplete="off" />
              </Field>
              <Field label="Name on ID">
                <input className={inputCls} style={cardBorder} value={form.idProof.holderName} onChange={set('idProof', 'holderName')} maxLength={50} />
              </Field>
            </>
          )}
        </section>

        <Notice message={message} />
        <button type="submit" disabled={busy || !loaded} className={primaryBtn} style={{ background: C.primary }}>{busy ? 'Saving...' : 'Save changes'}</button>
      </form>
    </AccountShell>
  )
}
