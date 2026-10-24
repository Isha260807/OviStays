import { cn } from "@/shared/utils/cn.js"

const tones = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  gray: "bg-neutral-100 text-neutral-700 border-neutral-200",
}

const statusTone = {
  confirmed: "blue", "checked in": "green", "checked out": "gray", pending: "amber",
  cancelled: "red", refunded: "gray", active: "green", inactive: "gray", suspended: "red",
  approved: "green", rejected: "red", paid: "green", failed: "red", open: "amber",
  resolved: "green", "in progress": "blue", closed: "gray", unread: "amber", read: "gray",
  published: "green", draft: "gray", expired: "red", processed: "green", sent: "green",
  scheduled: "blue",
}

export default function StatusBadge({ value }) {
  const tone = tones[statusTone[String(value).toLowerCase()] || "gray"]
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", tone)}>
      {value}
    </span>
  )
}
