'use client'
// Observe console — one error occurrence: a summary line that expands to its
// stack trace. A div with role="button" rather than a <button>, because the
// row contains a UserChip link and links can't nest inside buttons.
import type { ErrorSource, ObserveUserRef } from '@/services/types/observe'
import CopyButton from './CopyButton'
import UserChip from './UserChip'
import { SourcePill, StatusPill } from './pills'
import { fmtDateTime, fmtTime } from './format'

export interface ErrorOccurrence {
  ts: string
  source: ErrorSource
  message: string
  stack: string | null
  requestId: string | null
  status: number | null
  user: ObserveUserRef | null
}

interface Props {
  occurrence: ErrorOccurrence
  open: boolean
  onToggle: () => void
  /** Show the source pill (useful when a list mixes server and browser errors). */
  showSource?: boolean
  /** 'time' for a short slice, 'datetime' for a whole window. */
  timeFormat?: 'time' | 'datetime'
}

export default function ErrorOccurrenceRow({ occurrence: o, open, onToggle, showSource = false, timeFormat = 'datetime' }: Props) {
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault()
            onToggle()
          }
        }}
        className="w-full text-left px-5 py-2.5 hover:bg-gray-50 cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-gray-500 tabular-nums">{timeFormat === 'time' ? fmtTime(o.ts) : fmtDateTime(o.ts)}</span>
          {showSource && <SourcePill source={o.source} />}
          {o.status !== null && <StatusPill status={o.status} />}
          {o.requestId && <span className="font-mono text-gray-400 truncate hidden md:inline">req {o.requestId}</span>}
          <span className="ml-auto min-w-0">
            <UserChip user={o.user} compact />
          </span>
        </div>
        <p className="text-sm text-gray-800 mt-1 truncate">{o.message}</p>
      </div>
      {open &&
        (o.stack ? (
          <div className="mx-5 mb-3">
            <div className="flex justify-end mb-1">
              <CopyButton label="Copy stack" text={() => o.stack ?? ''} />
            </div>
            <pre className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] leading-relaxed text-gray-700 overflow-x-auto whitespace-pre">
              {o.stack}
            </pre>
          </div>
        ) : (
          <p className="mx-5 mb-3 text-xs text-gray-500">No stack captured for this occurrence.</p>
        ))}
    </li>
  )
}
