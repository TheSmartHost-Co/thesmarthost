'use client'

import { useState } from 'react'
import {
  CheckCircleIcon,
  XMarkIcon,
  PlayCircleIcon,
  FlagIcon,
  ClipboardDocumentListIcon,
  CameraIcon,
} from '@heroicons/react/24/outline'
import type { CleaningProjectStatus, ChecklistProgress } from '@/services/types/cleaningProject'

interface BottomActionBarProps {
  status: CleaningProjectStatus
  progress: ChecklistProgress | null
  completing: boolean
  issueCount: number
  supplyListCount: number
  onAccept?: (projectId: string) => Promise<void>
  onDecline?: (projectId: string) => Promise<void>
  onStart?: (projectId: string) => Promise<void>
  onComplete: () => void
  onClose: () => void
  onReportIssue: () => void
  onViewIssues: () => void
  onSubmitSupplyList: () => void
  onViewSupplyLists: () => void
  onScanReceipt?: () => void
  projectId: string
  walkthroughComplete?: boolean
  walkthroughRequired?: boolean
}

export default function BottomActionBar({
  status,
  progress,
  completing,
  issueCount,
  supplyListCount,
  onAccept,
  onDecline,
  onStart,
  onComplete,
  onClose,
  onReportIssue,
  onViewIssues,
  onSubmitSupplyList,
  onViewSupplyLists,
  onScanReceipt,
  projectId,
  walkthroughComplete,
  walkthroughRequired,
}: BottomActionBarProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const canComplete = progress &&
    progress.completedItems === progress.totalItems &&
    progress.photosUploaded >= progress.photoRequired &&
    (walkthroughComplete !== false)

  const handleAction = async (action: string, fn?: (id: string) => Promise<void>) => {
    if (!fn || actionLoading) return
    setActionLoading(action)
    try {
      await fn(projectId)
    } finally {
      setActionLoading(null)
    }
  }

  const Spinner = ({ className = 'border-white/30 border-t-white' }: { className?: string }) => (
    <div className={`w-4 h-4 border-2 rounded-full animate-spin ${className}`} />
  )

  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* Assigned: Accept + Decline */}
      {status === 'assigned' && onAccept && onDecline && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAction('accept', onAccept)}
            disabled={actionLoading !== null}
            className="flex-1 flex items-center justify-center gap-2 h-12 sm:h-10 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {actionLoading === 'accept' ? <Spinner /> : <CheckCircleIcon className="w-5 h-5" />}
            Accept
          </button>
          <button
            onClick={() => handleAction('decline', onDecline)}
            disabled={actionLoading !== null}
            className="flex items-center justify-center gap-2 h-12 sm:h-10 px-5 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {actionLoading === 'decline' ? <Spinner className="border-gray-400/30 border-t-gray-400" /> : <XMarkIcon className="w-5 h-5" />}
            Decline
          </button>
        </div>
      )}

      {/* Confirmed: Start Cleaning */}
      {status === 'confirmed' && onStart && (
        <button
          onClick={() => handleAction('start', onStart)}
          disabled={actionLoading !== null}
          className="w-full flex items-center justify-center gap-2 h-12 sm:h-10 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
        >
          {actionLoading === 'start' ? <Spinner /> : <PlayCircleIcon className="w-5 h-5" />}
          Start Cleaning
        </button>
      )}

      {/* In Progress: Issues icon + Complete + Supply icon */}
      {status === 'in_progress' && (
        <div className="relative flex items-center gap-2">
          {/* Issue button */}
          <button
            onClick={issueCount > 0 ? onViewIssues : onReportIssue}
            className="relative flex flex-col items-center justify-center w-14 h-12 sm:w-10 sm:h-10 text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer"
            title={issueCount > 0 ? `View ${issueCount} issues` : 'Report issue'}
          >
            <FlagIcon className="w-5 h-5" />
            <span className="text-[9px] sm:hidden">Issues</span>
            {issueCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-amber-600 rounded-full">
                {issueCount}
              </span>
            )}
          </button>

          {/* Complete button */}
          <button
            onClick={onComplete}
            disabled={!canComplete || completing}
            className={`
              flex-1 flex items-center justify-center gap-2 h-12 sm:h-10 text-sm font-medium rounded-xl transition-colors cursor-pointer
              ${canComplete
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {completing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircleIcon className="w-5 h-5" />
            )}
            {completing ? 'Completing...' : 'Complete Project'}
          </button>

          {walkthroughRequired && !walkthroughComplete && (
            <p className="absolute -top-6 left-0 right-0 text-xs text-amber-600 text-center">
              Upload walkthrough photos for all rooms first
            </p>
          )}

          {/* Scan + Supply list buttons */}
          <div className="flex items-center gap-1.5">
            {onScanReceipt && (
              <button
                onClick={onScanReceipt}
                className="relative flex flex-col items-center justify-center w-14 h-12 sm:w-10 sm:h-10 text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-xl transition-colors cursor-pointer"
                title="Scan receipt"
              >
                <CameraIcon className="w-5 h-5" />
                <span className="text-[9px] sm:hidden">Scan</span>
              </button>
            )}
            <button
              onClick={supplyListCount > 0 ? onViewSupplyLists : onSubmitSupplyList}
              className="relative flex flex-col items-center justify-center w-14 h-12 sm:w-10 sm:h-10 text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-xl transition-colors cursor-pointer"
              title={supplyListCount > 0 ? `View ${supplyListCount} supply lists` : 'Request supplies'}
            >
              <ClipboardDocumentListIcon className="w-5 h-5" />
              <span className="text-[9px] sm:hidden">Supplies</span>
              {supplyListCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-teal-600 rounded-full">
                  {supplyListCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Completed: Close */}
      {status === 'completed' && (
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 h-12 sm:h-10 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-xl transition-colors cursor-pointer"
        >
          Close
        </button>
      )}
    </div>
  )
}
