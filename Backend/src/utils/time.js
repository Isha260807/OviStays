// Calendar maths in a villa's own timezone. Dates are 'YYYY-MM-DD' strings, times are 'HH:mm',
// and everything stored in the database is a UTC instant.
export const DEFAULT_TZ = 'Asia/Kolkata'
export const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

export const isDateStr = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v)
export const isTimeStr = (v) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
export const isValidTz = (tz) => {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false }
}

const formatters = new Map()
function formatter(tz) {
  if (!formatters.has(tz)) {
    formatters.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }))
  }
  return formatters.get(tz)
}

// How far the timezone is ahead of UTC at a given instant, in ms
function offsetMs(tz, utcMs) {
  const p = Object.fromEntries(formatter(tz).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]))
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return asUtc - Math.floor(utcMs / 1000) * 1000
}

// 2025-03-10 + 12:00 in Asia/Kolkata -> the UTC instant
export function zonedToUtc(dateStr, timeStr, tz = DEFAULT_TZ) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  let t = guess - offsetMs(tz, guess)
  t = guess - offsetMs(tz, t) // second pass settles daylight-saving edges
  return new Date(t)
}

// A UTC instant -> the local date, time and weekday (0 = Sunday) in the timezone
export function utcToZoned(date, tz = DEFAULT_TZ) {
  const p = Object.fromEntries(formatter(tz).formatToParts(date).map((x) => [x.type, x.value]))
  const dateStr = `${p.year}-${p.month}-${p.day}`
  return { date: dateStr, time: `${p.hour}:${p.minute}`, weekday: weekdayOf(dateStr) }
}

export const weekdayOf = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay()

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const diffDays = (fromStr, toStr) => Math.round((Date.parse(`${toStr}T00:00:00Z`) - Date.parse(`${fromStr}T00:00:00Z`)) / DAY)

// [from, to) as a list of date strings
export function eachDate(from, to) {
  const out = []
  for (let d = from; d < to; d = addDays(d, 1)) out.push(d)
  return out
}

export const toMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}
export const fromMinutes = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
