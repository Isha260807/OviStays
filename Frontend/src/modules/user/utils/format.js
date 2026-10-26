// "24 Dec 2026"
export const shortDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

// "5 min ago", "3 days ago", then the date
export function timeAgo(d) {
  const secs = Math.round((Date.now() - new Date(d).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)} hr ago`
  if (secs < 7 * 86400) return `${Math.floor(secs / 86400)} days ago`
  return shortDate(d)
}

export const todayYmd = () => new Date().toISOString().slice(0, 10)
