'use client'

import { BoltIcon, ClipboardDocumentIcon, ArrowPathIcon, ExclamationCircleIcon, PlayIcon } from '@heroicons/react/24/outline'
import type { AutomationTask } from '@/services/types/automation'

interface AutomationTaskCardProps {
  task: AutomationTask
  onReview: (task: AutomationTask) => void
  onRetry: (task: AutomationTask) => void
  onProcess?: (task: AutomationTask) => void
  processingTaskId?: string | null
  selected?: boolean
  onSelect?: (taskId: string, selected: boolean) => void
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Scheduled', color: 'bg-gray-100 text-gray-700' },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700' },
  awaiting_approval: { label: 'Awaiting Approval', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  sent: { label: 'Sent', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-gray-100 text-gray-500' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-500' },
}

const typeConfig: Record<string, { label: string; color: string }> = {
  guest_review: { label: 'Guest Review', color: 'bg-violet-100 text-violet-700' },
  review_nudge: { label: 'Review Nudge', color: 'bg-amber-100 text-amber-700' },
}

export default function AutomationTaskCard({ task, onReview, onRetry, onProcess, processingTaskId, selected, onSelect }: AutomationTaskCardProps) {
  const status = statusConfig[task.status] || statusConfig.pending
  const type = typeConfig[task.type] || typeConfig.guest_review

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div
      onClick={() => onReview(task)}
      className={`bg-white border rounded-xl p-4 transition-shadow hover:shadow-md cursor-pointer ${
        selected ? 'border-blue-400 bg-blue-50/30 shadow-sm' : task.status === 'awaiting_approval' ? 'border-amber-200 shadow-sm' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {onSelect && (
          <input
            type="checkbox"
            checked={selected || false}
            onChange={(e) => { e.stopPropagation(); onSelect(task.id, e.target.checked) }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          {/* Guest name + listing */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {task.guestName || 'Unknown Guest'}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${type.color}`}>
              {type.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate mb-2">
            {task.listingName || 'Unknown Property'}
            {task.departureDate && ` — Checkout ${formatDate(task.departureDate)}`}
          </p>

          {/* Status badge + timing */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color}`}>
              {status.label}
            </span>
            {task.status === 'pending' && task.scheduledFor && (
              <span className="text-[10px] text-gray-400">
                Scheduled for {new Date(task.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            {task.status === 'sent' && task.sentAt && (
              <span className="text-[10px] text-gray-400">
                {task.errorMessage?.includes('externally') || task.errorMessage?.includes('detected')
                  ? task.errorMessage
                  : `Sent ${formatDate(task.sentAt)}`}
              </span>
            )}
            {task.status === 'failed' && task.errorMessage && (
              <span className="text-[10px] text-red-500 flex items-center gap-1 truncate max-w-48">
                <ExclamationCircleIcon className="w-3 h-3 flex-shrink-0" />
                {task.errorMessage}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {task.status === 'pending' && onProcess && (
            <button
              onClick={(e) => { e.stopPropagation(); onProcess(task) }}
              disabled={processingTaskId === task.id}
              title="Process the scheduled task now"
              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {processingTaskId === task.id ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
            </button>
          )}
          {task.status === 'awaiting_approval' && (
            <button
              onClick={(e) => { e.stopPropagation(); onReview(task) }}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <BoltIcon className="w-3.5 h-3.5" />
              Review
            </button>
          )}
          {task.status === 'approved' && task.type === 'guest_review' && (
            <button
              onClick={(e) => { e.stopPropagation(); onReview(task) }}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
            >
              <ClipboardDocumentIcon className="w-3.5 h-3.5" />
              Copy
            </button>
          )}
          {task.status === 'approved' && task.type === 'review_nudge' && (
            <button
              onClick={(e) => { e.stopPropagation(); onReview(task) }}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Send
            </button>
          )}
          {task.status === 'failed' && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(task) }}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
