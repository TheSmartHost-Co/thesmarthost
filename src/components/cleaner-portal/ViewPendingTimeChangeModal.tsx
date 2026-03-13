'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/shared/modal'
import { getPendingTimeChangeRequest } from '@/services/timeChangeRequestService'
import { formatTime } from '@/services/cleaningProjectService'
import { ClockIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { TimeChangeRequest } from '@/services/types/timeChangeRequest'

interface ViewPendingTimeChangeModalProps {
  isOpen: boolean
  onClose: () => void
  project: CleaningProject
}

// Format a date string (ISO or YYYY-MM-DD) to a readable format
function formatDate(dateStr: string) {
  const justDate = dateStr.split('T')[0]
  const date = new Date(justDate + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ViewPendingTimeChangeModal({
  isOpen,
  onClose,
  project,
}: ViewPendingTimeChangeModalProps) {
  const [request, setRequest] = useState<TimeChangeRequest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      getPendingTimeChangeRequest(project.id)
        .then(res => {
          if (res.status === 'success') {
            setRequest(res.data)
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [isOpen, project.id])

  const statusConfig = {
    pending: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700', icon: <ClockIcon className="w-4 h-4" /> },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircleIcon className="w-4 h-4" /> },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: <XMarkIcon className="w-4 h-4" /> },
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
            <ClockIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Time Change Request</h2>
            <p className="text-sm text-gray-500">{project.propertyName}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          </div>
        ) : !request ? (
          <div className="text-center py-8 text-gray-500">
            <p>No pending time change request found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg ${statusConfig[request.status].color}`}>
                {statusConfig[request.status].icon}
                {statusConfig[request.status].label}
              </span>
              <span className="text-xs text-gray-400">
                Submitted {new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>

            {/* Current vs Requested */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Current</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(request.currentProjectDate)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatTime(request.currentProjectStartTime) || 'Not set'} – {formatTime(request.currentProjectEndTime) || 'Not set'}
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <p className="text-xs font-medium text-amber-700 uppercase mb-2">Requested</p>
                <p className="text-sm font-semibold text-amber-900">{formatDate(request.requestedProjectDate)}</p>
                <p className="text-sm text-amber-700 mt-1">
                  {formatTime(request.requestedProjectStartTime) || 'Not set'} – {formatTime(request.requestedProjectEndTime) || 'Not set'}
                </p>
              </div>
            </div>

            {/* Reason */}
            {request.reason && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Your Reason</p>
                <p className="text-sm text-gray-700">{request.reason}</p>
              </div>
            )}

            {/* PM Notes (if rejected) */}
            {request.pmNotes && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <p className="text-xs font-medium text-red-600 uppercase mb-1">PM Response</p>
                <p className="text-sm text-red-700">{request.pmNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full mt-6 py-3 px-4 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}
