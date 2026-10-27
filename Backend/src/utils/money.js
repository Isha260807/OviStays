// Money is kept as whole paise (1 rupee = 100 paise) so amounts are never off by a fraction.
export const toPaise = (rupees) => Math.round(Number(rupees) * 100)
export const fromPaise = (paise) => paise / 100
export const isPaise = (n) => Number.isInteger(n) && n >= 0

// pct may have up to 2 decimals (12.5); the result is rounded to a whole paisa
export const percentOf = (paise, pct) => Math.round((paise * Math.round(Number(pct) * 100)) / 10000)

export const formatInr = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
