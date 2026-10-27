// How much of a payment goes back to the guest when a booking is cancelled. Pure functions.

const HOUR = 60 * 60 * 1000

// tiers: [{ hoursBeforeStart, refundPercent }] set by the admin. The tier with the largest
// hoursBeforeStart that still fits wins; cancelling later than every tier refunds nothing.
export function refundPercentFor(tiers = [], startAt, now = new Date()) {
  const hoursLeft = (new Date(startAt).getTime() - now.getTime()) / HOUR
  const sorted = [...tiers].sort((a, b) => b.hoursBeforeStart - a.hoursBeforeStart)
  const tier = sorted.find((t) => hoursLeft >= t.hoursBeforeStart)
  return { percent: tier ? tier.refundPercent : 0, hoursLeft: Math.max(0, Math.floor(hoursLeft)) }
}

/**
 * Who cancels decides the rule:
 *  - the owner or the platform ('owner', 'system'): full refund, always
 *  - an admin: the percent they typed, else the normal policy
 *  - the guest: the admin's refund tiers, and nothing once the stay has started
 */
export function computeRefund({ by, paidPaise, startAt, tiers, now = new Date(), adminPercent }) {
  if (!paidPaise) return { percent: 0, refundPaise: 0 }
  let percent
  if (by === 'owner' || by === 'system') percent = 100
  else if (by === 'admin' && adminPercent != null) percent = adminPercent
  else if (new Date(startAt) <= now) percent = 0
  else percent = refundPercentFor(tiers, startAt, now).percent
  percent = Math.min(100, Math.max(0, percent))
  return { percent, refundPaise: Math.round((paidPaise * Math.round(percent * 100)) / 10000) }
}

// The rule in words, for the villa page and the checkout: "100% refund up to 72 hours before check-in, 50% up to 24 hours before..."
export function refundPolicyText(tiers = []) {
  const sorted = [...tiers].filter((t) => t.refundPercent > 0).sort((a, b) => b.hoursBeforeStart - a.hoursBeforeStart)
  if (!sorted.length) return 'This booking is non-refundable.'
  const hours = (h) => (h % 24 === 0 && h >= 24 ? `${h / 24} day${h / 24 > 1 ? 's' : ''}` : `${h} hour${h === 1 ? '' : 's'}`)
  const parts = sorted.map((t) => `${t.refundPercent}% refund if you cancel ${hours(t.hoursBeforeStart)} or more before the start`)
  return `${parts.join('; ')}. Later cancellations are not refunded. If the host cancels, you get a full refund.`
}
