// Observe console — a list of requests, newest first. With `showUser` (the
// overview feed) each row carries a user chip; without it (a single user's
// detail page) unverified identities get a small dashed tag instead.
import type { ObserveUserRef, RequestRow } from '@/services/types/observe'
import { fmtTime } from './format'
import { ImpersonationMark, MethodTag, StatusPill } from './pills'
import StateBlock from './StateBlock'
import UserChip from './UserChip'

interface Props {
  items: (RequestRow & { user?: ObserveUserRef | null })[]
  showUser?: boolean
  empty?: string
}

export default function LiveFeed({ items, showUser = true, empty = 'No requests yet' }: Props) {
  if (items.length === 0) return <StateBlock kind="empty" message={empty} />
  return (
    <ul className="divide-y divide-gray-100">
      {items.map((it, i) => (
        <li key={`${it.requestId ?? i}-${it.ts}`} className="px-5 py-2 flex items-center gap-3 text-xs">
          <span className="font-mono text-gray-500 tabular-nums w-16 shrink-0">{fmtTime(it.ts)}</span>
          <StatusPill status={it.status} />
          <MethodTag method={it.method} />
          <span className="font-mono text-gray-700 truncate min-w-0 flex-1" title={it.path}>
            {it.route}
          </span>
          {it.impersonated && <ImpersonationMark />}
          {!showUser && !it.verified && (
            <span className="text-[10px] text-gray-400 border border-dashed border-gray-300 rounded px-1" title="Identity from an unverified token">
              unverified
            </span>
          )}
          <span className={`font-mono text-gray-400 tabular-nums w-14 text-right shrink-0 ${showUser ? 'hidden 2xl:inline' : ''}`}>
            {it.durationMs} ms
          </span>
          {showUser && (
            <span className="w-28 shrink-0 min-w-0">
              <UserChip user={it.user ?? null} compact unverified={!it.verified} />
            </span>
          )}
          {showUser && it.errorMessage && (
            <span className="hidden xl:inline text-rose-600 truncate max-w-[220px]" title={it.errorMessage}>
              {it.errorMessage}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
