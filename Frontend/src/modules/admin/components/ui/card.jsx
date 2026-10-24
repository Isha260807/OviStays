import { cn } from "@/shared/utils/cn.js"

// Same primitives as Grhapoch's shadcn card, so the dashboard markup carries over unchanged.
export function Card({ className, ...props }) {
  return <div className={cn("flex flex-col gap-6 rounded-xl border bg-white py-6 text-neutral-900 shadow-sm", className)} {...props} />
}
export function CardHeader({ className, ...props }) {
  return <div className={cn("grid auto-rows-min items-start gap-1.5 px-6", className)} {...props} />
}
export function CardTitle({ className, ...props }) {
  return <div className={cn("leading-none font-semibold", className)} {...props} />
}
export function CardContent({ className, ...props }) {
  return <div className={cn("px-6", className)} {...props} />
}
