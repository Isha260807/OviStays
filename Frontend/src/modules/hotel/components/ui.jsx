import { useEffect } from 'react'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { cn } from '@/shared/utils/cn.js'

// Small building blocks for the owner panel, so the pages stay short and look the same.
export const BRAND = '#168AD3'

export const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-500 disabled:bg-slate-50 disabled:text-slate-500'

export function Btn({ variant = 'primary', size = 'md', className, loading, children, ...props }) {
  const styles = {
    primary: 'bg-sky-600 text-white hover:bg-sky-700',
    outline: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    soft: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm' }
  return (
    <button type="button" {...props} disabled={props.disabled || loading}
      className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer', styles[variant], sizes[size], className)}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export const Input = (props) => <input {...props} className={cn(inputCls, props.className)} />
export const Select = ({ children, ...props }) => <select {...props} className={cn(inputCls, props.className)}>{children}</select>
export const Textarea = (props) => <textarea rows={3} {...props} className={cn(inputCls, props.className)} />

export function Card({ title, action, children, className }) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function PageTitle({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

const PILL = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  gray: 'bg-slate-100 text-slate-600 border-slate-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
}
const STATUS_TONE = {
  Approved: 'green', Verified: 'green', Active: 'green', Confirmed: 'blue', 'Checked In': 'green', 'Checked Out': 'gray', Paid: 'green', Earned: 'green',
  Draft: 'gray', 'Not Submitted': 'gray', Inactive: 'gray', Expired: 'gray', 'No Show': 'gray', Unpaid: 'gray', Upcoming: 'blue',
  'Pending Approval': 'amber', Submitted: 'amber', Requested: 'amber', 'Awaiting Payment': 'amber', 'Refund Pending': 'amber',
  Rejected: 'red', Suspended: 'red', Cancelled: 'red', 'Payment Failed': 'red', Failed: 'red',
  Refunded: 'purple', 'Partially Refunded': 'purple',
}
export function Pill({ children, tone }) {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold', PILL[tone || STATUS_TONE[children] || 'gray'])}>{children}</span>
}

export function Modal({ open, title, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={cn('relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl sm:rounded-xl bg-white shadow-xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /> {label}</div>
}

export function Empty({ title, text, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && <button type="button" onClick={onRetry} className="font-semibold underline cursor-pointer">Retry</button>}
    </div>
  )
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold', tone === 'warn' ? 'text-amber-600' : 'text-slate-900')}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
          className={cn('whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold -mb-px cursor-pointer', value === t.key ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
          {t.label}{t.badge ? <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  )
}

export function Pager({ page, pages, onChange }) {
  if (pages <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>Page {page} of {pages}</span>
      <div className="flex gap-2">
        <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Btn>
        <Btn variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Btn>
      </div>
    </div>
  )
}
