// Small in-memory rate limiter (fixed window). Counts live in this process only, so with several
// server instances each one counts on its own; put a shared store (Redis) behind it when scaling out.
export function rateLimit({ windowMs, max, key = (req) => req.ip, message = 'Too many requests. Please try again later.' }) {
  const hits = new Map()

  const sweep = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
  }, Math.max(windowMs, 60_000))
  sweep.unref()

  return (req, res, next) => {
    const now = Date.now()
    const id = key(req)
    let entry = hits.get(id)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(id, entry)
    }
    entry.count += 1
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000))
      return res.status(429).json({ success: false, message })
    }
    next()
  }
}
