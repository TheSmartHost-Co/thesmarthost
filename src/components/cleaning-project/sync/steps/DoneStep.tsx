'use client'

import { useMemo, useState } from 'react'
import { CheckCircleIcon, ChevronDownIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import type { SyncApplyResultItem, SyncCandidate } from '@/services/types/cleaningProject'

interface DoneStepProps {
  results: SyncApplyResultItem[]
  candidates: SyncCandidate[]
  onClose: () => void
  onOpenProject?: (projectId: string) => void
}

const DoneStep: React.FC<DoneStepProps> = ({ results, candidates, onClose, onOpenProject }) => {
  const [showCreated, setShowCreated] = useState(true)
  const [showFailures, setShowFailures] = useState(false)

  const candidateMap = useMemo(() => {
    const m = new Map<string, SyncCandidate>()
    for (const c of candidates) m.set(c.key, c)
    return m
  }, [candidates])

  const createdResults = useMemo(
    () => results.filter((r): r is SyncApplyResultItem & { projectId: string } => r.outcome === 'created' && !!r.projectId),
    [results]
  )
  const failuresAndSkips = useMemo(() => results.filter((r) => r.outcome !== 'created'), [results])

  const summary = {
    created: createdResults.length,
    skipped: results.filter((r) => r.outcome === 'skipped').length,
    failed: results.filter((r) => r.outcome === 'failed').length,
  }

  return (
    <div className="px-6 py-6 space-y-5">
      <div className="flex flex-col items-center text-center pt-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Sync complete</h3>
        <p className="text-sm text-gray-500 mt-1">
          {summary.created} created · {summary.skipped} skipped · {summary.failed} failed
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
          <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Created</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.created}</p>
        </div>
        <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Skipped</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{summary.skipped}</p>
        </div>
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-center">
          <p className="text-xs text-red-700 font-semibold uppercase tracking-wide">Failed</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{summary.failed}</p>
        </div>
      </div>

      {/* Created projects — pressable rows */}
      {createdResults.length > 0 && (
        <div className="border border-emerald-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowCreated((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50"
          >
            <span>New cleaning projects ({createdResults.length})</span>
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showCreated ? 'rotate-180' : ''}`} />
          </button>
          {showCreated && (
            <ul className="max-h-64 overflow-y-auto border-t border-emerald-100 divide-y divide-emerald-50 bg-white">
              {createdResults.map((r) => {
                const c = candidateMap.get(r.key)
                const clickable = !!onOpenProject
                return (
                  <li key={r.key}>
                    <button
                      type="button"
                      onClick={() => clickable && onOpenProject!(r.projectId)}
                      disabled={!clickable}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        clickable ? 'hover:bg-emerald-50 cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium truncate">
                          {c?.propertyName || 'Property'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {c?.projectDate || 'no date'}
                          {c?.guestName ? ` · ${c.guestName}` : ''}
                        </p>
                      </div>
                      {clickable && (
                        <ArrowTopRightOnSquareIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Skipped + failed details */}
      {failuresAndSkips.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowFailures((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span>Skipped &amp; failed ({failuresAndSkips.length})</span>
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showFailures ? 'rotate-180' : ''}`} />
          </button>
          {showFailures && (
            <div className="max-h-56 overflow-y-auto border-t border-gray-100 divide-y divide-gray-100 text-xs">
              {failuresAndSkips.map((r) => {
                const c = candidateMap.get(r.key)
                return (
                  <div key={r.key} className="px-4 py-2 flex items-start gap-3">
                    <span
                      className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        r.outcome === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {r.outcome}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium">
                        {c?.propertyName || 'Unknown property'} — {c?.projectDate || 'no date'}
                      </p>
                      <p className="text-gray-500 mt-0.5">{r.reason || 'no reason given'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default DoneStep
