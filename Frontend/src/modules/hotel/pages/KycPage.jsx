import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Circle, Clock, FileText, Loader2, Trash2, Upload, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/services/api/axios.js'
import { uploadImage, uploadPdf, IMAGE_TYPES } from '@/services/api/uploads.js'
import { assetUrl } from '@/services/api/config.js'
import { Link } from 'react-router-dom'
import { useAsync } from '../components/useAsync.js'
import { Btn, Card, ErrorBox, Field, Input, PageTitle, Pill, Select, Spinner } from '../components/ui.jsx'
import { ownerAPI } from '../services/ownerAPI.js'
import { dateOnly } from '@/shared/utils/booking.js'

const DOC_TYPES = ['PAN card', 'Aadhaar', 'GST certificate', 'Cancelled cheque', 'Property proof', 'Other']

function Documents({ docs, onChange, disabled }) {
  const ref = useRef(null)
  const [type, setType] = useState(DOC_TYPES[0])
  const [busy, setBusy] = useState(false)

  const pick = async (file) => {
    if (!file) return
    const isPdf = file.type === 'application/pdf'
    if (!isPdf && !IMAGE_TYPES.includes(file.type)) return toast.error('Upload a PDF or an image (JPEG, PNG, WebP)')
    setBusy(true)
    try {
      const { url } = isPdf ? await uploadPdf(file) : await uploadImage(file, 'misc')
      onChange([...docs, { type, url }])
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {docs.map((d, i) => (
          <li key={d.url} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <a href={assetUrl(d.url)} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-sky-700"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{d.type}</span></a>
            {!disabled && <button type="button" aria-label="Remove" onClick={() => onChange(docs.filter((_, j) => j !== i))} className="text-red-600 cursor-pointer"><Trash2 className="h-4 w-4" /></button>}
          </li>
        ))}
        {docs.length === 0 && <li className="text-sm text-slate-500">No documents yet.</li>}
      </ul>
      {!disabled && (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Document"><Select value={type} onChange={(e) => setType(e.target.value)}>{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <input ref={ref} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          <Btn variant="outline" onClick={() => ref.current?.click()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload</Btn>
        </div>
      )}
    </div>
  )
}

// Where the owner stands: documents sent, admin review, then the host panel opens
export function ReviewSteps({ status }) {
  const submitted = status !== 'Not Submitted'
  const steps = [
    { label: 'Create your account', done: true },
    { label: 'Submit your documents', done: submitted && status !== 'Rejected', hint: status === 'Rejected' ? 'Needs changes' : '' },
    { label: 'Admin reviews them', done: status === 'Verified', active: status === 'Submitted' },
    { label: 'Host panel opens', done: status === 'Verified' },
  ]
  const tone = status === 'Rejected' ? 'border-red-200 bg-red-50' : status === 'Submitted' ? 'border-amber-200 bg-amber-50' : 'border-sky-200 bg-sky-50'
  return (
    <div className={`rounded-xl border p-5 ${tone}`}>
      <h2 className="text-lg font-bold text-slate-900">
        {status === 'Submitted' ? 'Your profile is under review' : status === 'Rejected' ? 'Your documents need changes' : 'Complete your profile to get started'}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {status === 'Submitted' ? 'We are checking your documents. You will get a notification as soon as you are approved, and then your dashboard will open.'
          : status === 'Rejected' ? 'Please correct the details below and send them again.'
          : 'Add your details and documents below. Your dashboard and villa listing open after an admin approves them.'}
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-4">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {s.done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : s.active ? <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> : s.hint ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
            <span className={s.done ? 'font-medium text-slate-900' : 'text-slate-600'}>{s.label}{s.hint ? ` (${s.hint})` : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function KycPage() {
  const { data: p, error, loading, reload } = useAsync(() => ownerAPI.profile(), [])
  const [kyc, setKyc] = useState({ panNumber: '', panName: '', gstin: '', documents: [], bank: { holderName: '', accountNumber: '', ifsc: '', bankName: '', upi: '' } })
  const [busy, setBusy] = useState('')

  useEffect(() => {
    if (!p) return
    setKyc((k) => ({ ...k, panNumber: p.kyc.panNumber, panName: p.kyc.panName, gstin: p.kyc.gstin, documents: p.kyc.documents, bank: { ...k.bank, holderName: p.bank.holderName, ifsc: p.bank.ifsc, bankName: p.bank.bankName, upi: p.bank.upi } }))
  }, [p])

  if (loading && !p) return <Spinner />
  if (error) return <ErrorBox message={error} onRetry={reload} />

  const locked = ['Submitted', 'Verified'].includes(p.kyc.status)
  const submitKyc = async (e) => {
    e.preventDefault()
    setBusy('kyc')
    try { await ownerAPI.submitKyc(kyc); toast.success('Submitted for verification'); reload() } catch (err) { toast.error(errorMessage(err)) } finally { setBusy('') }
  }
  const k = (field) => (e) => setKyc((x) => ({ ...x, [field]: e.target.value }))
  const b = (field) => (e) => setKyc((x) => ({ ...x, bank: { ...x.bank, [field]: e.target.value } }))

  return (
    <>
      <PageTitle title="KYC & payout account" subtitle={`Host ID ${p.refId}`} actions={<><Link to="/hotel/profile" className="text-sm font-semibold text-sky-700">Back</Link><Pill>{p.kyc.status}</Pill></>} />
      <div className="space-y-5">
        {p.kyc.status !== 'Verified' && <ReviewSteps status={p.kyc.status} />}
        <Card title="Documents and bank">
          {p.kyc.status === 'Rejected' && <div className="mb-4"><ErrorBox message={`We could not verify your details: ${p.kyc.rejectReason}. Please correct them and submit again.`} /></div>}
          {p.kyc.status === 'Submitted' && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Submitted on {dateOnly(p.kyc.submittedAt)}. We are reviewing it.</p>}
          {p.kyc.status === 'Verified' && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Verified on {dateOnly(p.kyc.verifiedAt)}. You can now submit villas for approval. Payouts go to the account ending {p.bank.last4}.</p>}
          <form onSubmit={submitKyc} className="space-y-5">
            <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
              <Field label="PAN number"><Input value={kyc.panNumber} onChange={(e) => setKyc({ ...kyc, panNumber: e.target.value.toUpperCase() })} maxLength={10} required placeholder="ABCDE1234F" /></Field>
              <Field label="Name on PAN"><Input value={kyc.panName} onChange={k('panName')} required /></Field>
              <Field label="GSTIN (if registered)"><Input value={kyc.gstin} onChange={(e) => setKyc({ ...kyc, gstin: e.target.value.toUpperCase() })} maxLength={15} /></Field>
              <span />
              <Field label="Account holder name"><Input value={kyc.bank.holderName} onChange={b('holderName')} required /></Field>
              <Field label="Bank account number" hint={p.bank.last4 ? `Saved account ends ${p.bank.last4}. Enter it again to change.` : undefined}><Input value={kyc.bank.accountNumber} onChange={(e) => setKyc({ ...kyc, bank: { ...kyc.bank, accountNumber: e.target.value.replace(/\D/g, '') } })} inputMode="numeric" maxLength={18} required={!locked} autoComplete="off" /></Field>
              <Field label="IFSC code"><Input value={kyc.bank.ifsc} onChange={(e) => setKyc({ ...kyc, bank: { ...kyc.bank, ifsc: e.target.value.toUpperCase() } })} maxLength={11} required placeholder="HDFC0001234" /></Field>
              <Field label="Bank name"><Input value={kyc.bank.bankName} onChange={b('bankName')} /></Field>
              <Field label="UPI ID (optional)"><Input value={kyc.bank.upi} onChange={b('upi')} /></Field>
            </fieldset>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Documents</p>
              <Documents docs={kyc.documents} disabled={locked} onChange={(documents) => setKyc((x) => ({ ...x, documents }))} />
              <p className="mt-2 text-xs text-slate-500">Upload your PAN card and any property or GST proof. Your documents are only seen by the OviStays verification team.</p>
            </div>
            {!locked && <Btn type="submit" loading={busy === 'kyc'} disabled={kyc.documents.length === 0}>Submit for verification</Btn>}
          </form>
        </Card>
      </div>
    </>
  )
}
