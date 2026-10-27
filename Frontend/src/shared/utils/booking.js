// Small helpers shared by the guest booking flow and the owner panel.
// Dates are 'YYYY-MM-DD' strings in India time; money arrives from the server as whole paise.

const TZ = 'Asia/Kolkata'

export const formatPaise = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
export const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100)
export const toRupees = (paise) => (paise ? String(paise / 100) : '')

export const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export const diffDays = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
export const monthStart = (dateStr) => `${dateStr.slice(0, 7)}-01`
export const addMonths = (dateStr, n) => {
  const d = new Date(`${monthStart(dateStr)}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 10)
}
export const weekdayOf = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay()

// Cells for a month grid starting on Sunday: dates of the month with leading / trailing nulls
export function monthCells(dateStr) {
  const first = monthStart(dateStr)
  const next = addMonths(first, 1)
  const days = diffDays(first, next)
  const cells = Array.from({ length: weekdayOf(first) }, () => null)
  for (let i = 0; i < days; i++) cells.push(addDays(first, i))
  while (cells.length % 7) cells.push(null)
  return cells
}

export const monthLabel = (dateStr) => new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
export const dayLabel = (dateStr) => new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
export const fullDate = (dateStr) => new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

// An instant (ISO string) shown in India time
export const dateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '')
export const dateOnly = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }) : '')
export const timeOnly = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }) : '')
export const localDateOf = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso))
export const localTimeOf = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))

export const MODE_LABEL = { night: 'Night stay', dayUse: 'Day use', hourly: 'Hourly slot' }

// "2 hours 10 minutes left" style countdown from an ISO deadline
export function timeLeft(iso, now = Date.now()) {
  const ms = new Date(iso).getTime() - now
  if (ms <= 0) return 'expired'
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m} min left`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ${m % 60}m left` : `${Math.floor(h / 24)}d ${h % 24}h left`
}

export const slotText = (b) => {
  if (b.mode === 'night') return `${dateOnly(b.checkIn)}, ${timeOnly(b.checkIn)} → ${dateOnly(b.checkOut)}, ${timeOnly(b.checkOut)} · ${b.nights} ${b.nights === 1 ? 'night' : 'nights'}`
  return `${dateOnly(b.checkIn)}, ${timeOnly(b.checkIn)} – ${timeOnly(b.checkOut)}${b.slot?.packageName ? ` · ${b.slot.packageName}` : ''}`
}
