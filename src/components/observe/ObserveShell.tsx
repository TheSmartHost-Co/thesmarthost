'use client'
// Observe console — chrome that lives INSIDE the PM layout (the PM sidebar and
// navbar already exist): a header with the window picker, the Live toggle and
// "updated Xs ago", plus a horizontal tab bar for the five sections. Non-admins
// get an access-denied card; the backend independently returns 403.
import { ReactNode, Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Squares2X2Icon,
  PresentationChartLineIcon,
  UsersIcon,
  RectangleStackIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  SignalIcon,
} from '@heroicons/react/24/outline'
import { useObserveStore, WINDOW_KEYS, isWindowKey } from '@/store/useObserveStore'
import { useObserveAccess } from '@/hooks/useObserveAccess'
import type { WindowKey } from '@/services/types/observe'
import { timeAgo } from './format'
import { observeLinks, observeSections } from './paths'
import SegmentedControl from './SegmentedControl'

const NAV = [
  { section: 'overview', label: 'Overview', icon: Squares2X2Icon, exact: true },
  { section: 'activity', label: 'Activity', icon: PresentationChartLineIcon },
  { section: 'users', label: 'Users', icon: UsersIcon },
  { section: 'features', label: 'Features', icon: RectangleStackIcon },
  { section: 'errors', label: 'Errors', icon: ExclamationTriangleIcon },
] as const

const isActive = (pathname: string, href: string, exact?: boolean) =>
  exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

/**
 * Two-way sync between ?window= and the store. The URL wins on first paint so a
 * shared link opens the same window; afterwards the picker writes both.
 * Renders nothing — it exists to own the useSearchParams() call inside Suspense.
 */
function WindowUrlSync({ onSynced }: { onSynced: () => void }) {
  const window = useObserveStore((s) => s.window)
  const setWindow = useObserveStore((s) => s.setWindow)
  const params = useSearchParams()
  const q = params.get('window')

  useEffect(() => {
    if (isWindowKey(q) && q !== window) setWindow(q)
    onSynced()
    // Only react to the URL changing (back/forward, shared link), not the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  return null
}

function WindowPicker() {
  const window = useObserveStore((s) => s.window)
  const setWindow = useObserveStore((s) => s.setWindow)
  const router = useRouter()
  const pathname = usePathname()

  const choose = (k: WindowKey) => {
    setWindow(k)
    // Read the live query string rather than useSearchParams() so this control
    // doesn't itself need a Suspense boundary.
    const next = new URLSearchParams(globalThis.location?.search ?? '')
    next.set('window', k)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  return <SegmentedControl options={WINDOW_KEYS} value={window} onChange={choose} ariaLabel="Time window" />
}

function LiveToggle() {
  const live = useObserveStore((s) => s.live)
  const setLive = useObserveStore((s) => s.setLive)
  const lastRefreshed = useObserveStore((s) => s.lastRefreshed)
  // Re-render every 5 s so "updated Xs ago" keeps counting.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex items-center gap-3">
      <span className="hidden sm:inline text-[11px] text-gray-500 tabular-nums min-w-[90px] text-right">
        {lastRefreshed ? `updated ${timeAgo(new Date(lastRefreshed).toISOString(), Math.max(now, lastRefreshed))}` : ''}
      </span>
      <button
        type="button"
        onClick={() => setLive(!live)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors shadow-sm ${
          live
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-gray-200 bg-white text-gray-600 hover:text-gray-900'
        }`}
        title={live ? 'Auto-refresh every 30 s (on, pauses while this tab is hidden)' : 'Auto-refresh (off)'}
      >
        <span className="relative flex h-2 w-2">
          {live && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? 'bg-emerald-500' : 'bg-gray-400'}`} />
        </span>
        {live ? 'Live' : 'Paused'}
      </button>
    </div>
  )
}

function AccessDenied() {
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="inline-flex p-3 rounded-xl bg-red-100 text-red-600 mb-4">
        <ShieldExclamationIcon className="w-8 h-8" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Access denied</h2>
      <p className="text-sm text-gray-500">Observe is only available to platform admins.</p>
    </div>
  )
}

export default function ObserveShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const window = useObserveStore((s) => s.window)
  const links = observeLinks(window)
  const { isPlatformAdmin, loading } = useObserveAccess()
  // Hold the pages until ?window= has been applied, so a shared 7d link
  // doesn't first fetch the default 24h.
  const [synced, setSynced] = useState(false)

  const sync = (
    <Suspense fallback={null}>
      <WindowUrlSync onSynced={() => setSynced(true)} />
    </Suspense>
  )

  if (loading) {
    return (
      <>
        {sync}
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      </>
    )
  }
  if (!isPlatformAdmin) return <AccessDenied />

  return (
    <div className="max-w-[1600px] mx-auto">
      {sync}

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-9 w-9 shrink-0 rounded-xl bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center">
              <SignalIcon className="h-5 w-5 text-amber-600" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">Observe</h1>
              <p className="text-xs text-gray-500">Platform usage, errors and performance</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <WindowPicker />
            <LiveToggle />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 border-t border-gray-100" aria-label="Observe sections">
          {NAV.map(({ section, label, icon: Icon, ...rest }) => {
            const active = isActive(pathname, observeSections[section], 'exact' in rest && rest.exact)
            return (
              <Link
                key={section}
                href={links[section]}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  active
                    ? 'border-amber-500 text-amber-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-amber-600' : ''}`} />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      {synced ? children : null}
    </div>
  )
}
