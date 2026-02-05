'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  XMarkIcon,
  HomeModernIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { assignCleanerToProject, updateCleaningProject, getStatusDisplay, formatDuration } from '@/services/cleaningProjectService'
import EditProjectModal from './update/EditProjectModal'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import type { Property } from '@/services/types/property'

interface ProjectDetailModalProps {
  isOpen: boolean
  onClose: () => void
  project: CleaningProject
  cleaners: Cleaner[]
  properties: Property[]
  onUpdate: (project: CleaningProject) => void
}

export default function ProjectDetailModal({
  isOpen,
  onClose,
  project,
  cleaners,
  properties,
  onUpdate,
}: ProjectDetailModalProps) {
  const showNotification = useNotificationStore((state) => state.showNotification)
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedCleanerId, setSelectedCleanerId] = useState(project.cleanerId || '')
  const [showEditModal, setShowEditModal] = useState(false)

  const statusDisplay = getStatusDisplay(project.status)

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Format time for display
  const formatTime = (time: string | null | undefined) => {
    if (!time) return 'Not set'
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  // Handle cleaner assignment
  const handleAssignCleaner = async () => {
    if (!selectedCleanerId) {
      showNotification('Please select a cleaner', 'error')
      return
    }

    setIsAssigning(true)
    try {
      const res = await assignCleanerToProject(project.id, { cleanerId: selectedCleanerId })
      if (res.status === 'success') {
        showNotification('Cleaner assigned successfully', 'success')
        onUpdate(res.data)
      } else {
        showNotification(res.message || 'Failed to assign cleaner', 'error')
      }
    } catch (err) {
      console.error('Error assigning cleaner:', err)
      showNotification('Error assigning cleaner', 'error')
    } finally {
      setIsAssigning(false)
    }
  }

  // Get status badge color
  const getStatusBadgeClasses = () => {
    const colorMap: Record<string, string> = {
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      gray: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return colorMap[statusDisplay.color] || colorMap.gray
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-auto overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <CalendarDaysIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Project Details</h2>
              <p className="text-sm text-gray-500">{formatDate(project.scheduledDate)}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Status and Same-day badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-lg border ${getStatusBadgeClasses()}`}>
              {statusDisplay.label}
            </span>
            {project.isSameDayTurnover && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-amber-100 text-amber-700 rounded-lg border border-amber-200">
                <ExclamationTriangleIcon className="w-4 h-4" />
                Same-Day Turnover
              </span>
            )}
            {project.source !== 'manual' && (
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg">
                via {project.source === 'hostaway' ? 'Hostaway' : 'iCal'}
              </span>
            )}
          </div>

          {/* Property Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <HomeModernIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Property</p>
                <p className="font-semibold text-gray-900 mt-0.5">{project.propertyName || 'Unknown'}</p>
                {project.propertyAddress && (
                  <p className="text-sm text-gray-500 mt-0.5">{project.propertyAddress}</p>
                )}
              </div>
            </div>
          </div>

          {/* Cleaner Assignment */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${project.cleanerId ? 'bg-green-100' : 'bg-amber-100'}`}>
                <UserCircleIcon className={`w-5 h-5 ${project.cleanerId ? 'text-green-600' : 'text-amber-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Cleaner</p>
                {project.cleanerId ? (
                  <div className="mt-0.5">
                    <p className="font-semibold text-gray-900">{project.cleanerName}</p>
                    <p className="text-sm text-gray-500">{project.cleanerEmail || project.cleanerPhone || 'No contact'}</p>
                    {project.cleanerAccepted === true && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-green-600">
                        <CheckCircleIcon className="w-3.5 h-3.5" /> Accepted
                      </span>
                    )}
                    {project.cleanerAccepted === false && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-red-600">
                        <XMarkIcon className="w-3.5 h-3.5" /> Declined
                      </span>
                    )}
                    {project.cleanerAccepted === null && project.status === 'assigned' && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-amber-600">
                        <ClockIcon className="w-3.5 h-3.5" /> Awaiting response
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mt-2">
                    <select
                      value={selectedCleanerId}
                      onChange={(e) => setSelectedCleanerId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select a cleaner...</option>
                      {cleaners.filter(c => c.isActive).map(cleaner => (
                        <option key={cleaner.id} value={cleaner.id}>
                          {cleaner.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignCleaner}
                      disabled={!selectedCleanerId || isAssigning}
                      className="mt-2 w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {isAssigning ? 'Assigning...' : 'Assign Cleaner'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Time Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <ClockIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Checkout</span>
              </div>
              <p className="font-semibold text-gray-900">{formatTime(project.checkoutTime)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <ClockIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Check-in</span>
              </div>
              <p className="font-semibold text-gray-900">{formatTime(project.checkinTime)}</p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            {project.guestCount && (
              <div className="flex items-center gap-3 text-gray-600">
                <UserGroupIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm">{project.guestCount} guests</span>
              </div>
            )}
            {project.estimatedDurationMinutes && (
              <div className="flex items-center gap-3 text-gray-600">
                <ClockIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm">Est. {formatDuration(project.estimatedDurationMinutes)}</span>
              </div>
            )}
          </div>

          {/* Guest Info */}
          {(project.guestName || project.reservationCode) && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Booking Info</p>
              {project.guestName && (
                <p className="text-sm text-gray-700">Guest: <span className="font-medium">{project.guestName}</span></p>
              )}
              {project.reservationCode && (
                <p className="text-sm text-gray-500">Reservation: {project.reservationCode}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {project.pmNotes && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <DocumentTextIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">PM Notes</span>
              </div>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{project.pmNotes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors cursor-pointer"
          >
            <PencilSquareIcon className="w-4 h-4" />
            Edit Project
          </button>
        </div>
      </motion.div>

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={(updatedProject) => {
          setShowEditModal(false)
          onUpdate(updatedProject)
        }}
        project={project}
        properties={properties}
        cleaners={cleaners}
      />
    </Modal>
  )
}
