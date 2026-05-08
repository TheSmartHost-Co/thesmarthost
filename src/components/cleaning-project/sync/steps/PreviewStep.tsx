'use client'

import { motion } from 'framer-motion'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import type { SyncCandidate, SyncStats } from '@/services/types/cleaningProject'

interface PreviewStepProps {
  loading: boolean
  error: string | null
  candidates: SyncCandidate[]
  stats: SyncStats
  warnings: string[]
  selectedKeys: Set<string>
  onToggleKey: (key: string) => void
  onSelectAllNew: () => void
  onSelectNone: () => void
  onBack: () => void
  onApply: () => void
  onRetry: () => void
}

const STATUS_BADGE: Record<SyncCandidate['status'], { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  duplicate: { label: 'Duplicate', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  not_managed: { label: 'Not managed', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  unmapped: { label: 'Unmapped', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
}

const SOURCE_BADGE: Record<SyncCandidate['source'], { label: string; cls: string }> = {
  local: { label: 'Local', cls: 'bg-blue-50 text-blue-700' },
  pms: { label: 'PMS', cls: 'bg-purple-50 text-purple-700' },
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  loading,
  error,
  candidates,
  stats,
  warnings,
  selectedKeys,
  onToggleKey,
  onSelectAllNew,
  onSelectNone,
  onBack,
  onApply,
  onRetry,
}) => {
  if (loading) {
    return (
      <div className="px-6 py-12 flex flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full"
        />
        <p className="text-sm text-gray-500 mt-4">Scanning bookings and PMS reservations…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-6 py-12 flex flex-col items-center justify-center">
        <XCircleIcon className="w-12 h-12 text-red-400 mb-3" />
        <p className="text-sm font-medium text-gray-900">Couldn’t load candidates</p>
        <p className="text-xs text-gray-500 mt-1 text-center max-w-md">{error}</p>
        <div className="flex items-center gap-2 mt-4">
          <button onClick={onBack} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Back
          </button>
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const selectedCount = candidates.filter((c) => c.status === 'new' && selectedKeys.has(c.key)).length
  const newCount = stats.new

  return (
    <div className="px-6 py-5 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="New" value={stats.new} tone="emerald" />
        <StatCard label="Duplicates" value={stats.duplicate} tone="gray" />
        <StatCard label="Not managed" value={stats.notManaged} tone="amber" />
        <StatCard label="Unmapped" value={stats.unmapped} tone="orange" />
      </div>

      {warnings.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700 space-y-0.5">
            {warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        </div>
      )}

      {candidates.length === 0 && (
        <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
          <CheckCircleIcon className="w-12 h-12 text-emerald-400 mb-3" />
          <p className="text-sm font-medium text-gray-900">All caught up</p>
          <p className="text-xs text-gray-500 mt-1 max-w-md">
            No missing cleaning projects in this date range. Try a wider range or different filters.
          </p>
        </div>
      )}

      {candidates.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button onClick={onSelectAllNew} className="text-purple-600 hover:underline font-medium">
                Select all new
              </button>
              <span className="text-gray-300">·</span>
              <button onClick={onSelectNone} className="text-gray-500 hover:underline">
                Select none
              </button>
            </div>
            <span className="text-gray-500">
              {selectedCount} of {newCount} new selected
            </span>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    <th className="px-3 py-2 w-10"></th>
                    <th className="px-3 py-2">Property</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Guest</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {candidates.map((c) => {
                    const isSelectable = c.status === 'new' && !!c.propertyId
                    const isSelected = selectedKeys.has(c.key)
                    const sBadge = STATUS_BADGE[c.status]
                    const srcBadge = SOURCE_BADGE[c.source]
                    return (
                      <tr
                        key={c.key}
                        className={`${isSelectable ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-60'}`}
                        onClick={() => isSelectable && onToggleKey(c.key)}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isSelectable}
                            onChange={() => isSelectable && onToggleKey(c.key)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:bg-gray-100"
                          />
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {c.propertyName ? (
                            <span>{c.propertyName}</span>
                          ) : (
                            <span className="text-gray-400 italic">Listing name unavailable</span>
                          )}
                          {c.pmsProvider && (
                            <span className="ml-2 text-[10px] uppercase text-gray-400">{c.pmsProvider}</span>
                          )}
                          {c.status === 'unmapped' && c.propertyName && (
                            <span className="block text-[10px] text-orange-600 mt-0.5">
                              Not linked to any of your properties
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{c.projectDate}</td>
                        <td className="px-3 py-2 text-gray-700">
                          {c.guestName || '—'}
                          {c.reservationCode && (
                            <span className="block text-[10px] text-gray-400">{c.reservationCode}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${srcBadge.cls}`}>
                            {srcBadge.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${sBadge.cls}`}>
                            {sBadge.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {stats.unmapped > 0 && (
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Unmapped listings have no property link. Map them in Settings &rarr; PMS Listings, then re-run the sync.
              </span>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={selectedCount === 0}
          className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Apply {selectedCount > 0 ? `(${selectedCount})` : ''}
        </button>
      </div>
    </div>
  )
}

const StatCard = ({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'gray' | 'amber' | 'orange' }) => {
  const cls = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
  }[tone]
  return (
    <div className={`px-3 py-2 rounded-lg border ${cls}`}>
      <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
    </div>
  )
}

export default PreviewStep
