import { Link } from 'react-router-dom'
import { HomeNavbar, BottomNav } from '../home/HomeNav.jsx'
import { C } from '../home/homeUi.jsx'

// Frame for the guest pages that are not in the profile area: navbar, title, content, bottom tabs
export function PageShell({ title, subtitle, action, children, narrow = false }) {
  return (
    <div className="min-h-screen pb-24 md:pb-0 antialiased" style={{ background: C.cream, color: C.ink }}>
      <HomeNavbar />
      <main className={`${narrow ? 'max-w-[760px]' : 'max-w-[1360px]'} mx-auto px-4 md:px-6 lg:px-10 pt-6 md:pt-10 pb-8`}>
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h1 className="font-serif-display text-2xl lg:text-4xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm mt-1" style={{ color: C.muted }}>{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, actionLabel, actionTo }) {
  return (
    <div className="mt-14 flex flex-col items-center text-center">
      <span className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: C.peach, color: C.primaryDark }}><Icon className="w-7 h-7" /></span>
      <h2 className="font-serif-display text-xl font-bold mt-4">{title}</h2>
      {text && <p className="text-sm mt-1 max-w-xs" style={{ color: C.muted }}>{text}</p>}
      {actionTo && <Link to={actionTo} className="mt-5 rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ background: C.primary }}>{actionLabel}</Link>}
    </div>
  )
}

export function Skeletons({ count = 3, className = 'h-[128px]', grid = 'grid gap-4 lg:grid-cols-3' }) {
  return (
    <div className={`${grid} animate-pulse`}>
      {Array.from({ length: count }).map((_, i) => <div key={i} className={`${className} rounded-2xl bg-[#DDF3FF]`} />)}
    </div>
  )
}

export function ErrorNote({ text = 'Could not load this right now. Please try again.' }) {
  return <p className="mt-10 text-center text-sm text-red-600">{text}</p>
}
