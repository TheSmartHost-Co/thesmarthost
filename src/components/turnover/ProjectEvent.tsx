'use client'

import {
  ClockIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  HomeModernIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  FlagIcon,
} from '@heroicons/react/24/outline'
import type { CleaningProject, CleaningProjectStatus } from '@/services/types/cleaningProject'

interface ProjectEventProps {
  project: CleaningProject
  showProperty?: boolean // When in cleaner view, show property name instead of cleaner
  openIssueCount?: number // Number of open/acknowledged issues
}

export default function ProjectEvent({ project, showProperty = false, openIssueCount = 0 }: ProjectEventProps) {
  const statusConfig = getStatusConfig(project.status)
  const isUnassigned = !project.cleanerId

  // Format time display
  const formatTime = (time: string | null | undefined) => {
    if (!time) return null
    // Convert HH:MM:SS to 12h format
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  return (
    <div
      className={`
        group relative w-full rounded-lg border-l-4 px-2.5 py-1.5 cursor-pointer
        transition-all hover:shadow-md hover:scale-[1.02]
        ${isUnassigned ? 'bg-amber-50 border-amber-400' : statusConfig.bg}
        ${statusConfig.border}
      `}
    >
      {/* Main content */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Title: Cleaner name or Property name */}
          <div className="flex items-center gap-1.5">
            {showProperty ? (
              <HomeModernIcon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            ) : (
              <UserCircleIcon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            )}
            <span className={`text-xs font-semibold truncate ${isUnassigned ? 'text-amber-700' : statusConfig.text}`}>
              {showProperty
                ? (project.propertyName || 'Unknown Property')
                : (project.cleanerName || 'Unassigned')
              }
            </span>
          </div>

          {/* Time info */}
          {(project.checkoutTime || project.checkinTime) && (
            <div className="flex items-center gap-1 mt-0.5">
              <ClockIcon className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-500">
                {formatTime(project.checkoutTime)}
                {project.checkoutTime && project.checkinTime && ' → '}
                {formatTime(project.checkinTime)}
              </span>
            </div>
          )}
        </div>

        {/* Status icon */}
        <div className={`flex-shrink-0 ${statusConfig.iconColor}`}>
          {statusConfig.icon}
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        {/* Same day turnover badge */}
        {project.isSameDayTurnover && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
            <ExclamationTriangleIcon className="w-2.5 h-2.5" />
            Same Day
          </span>
        )}

        {/* Issues badge */}
        {openIssueCount > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">
            <FlagIcon className="w-2.5 h-2.5" />
            {openIssueCount} issue{openIssueCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Status badge */}
        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${statusConfig.badge}`}>
          {statusConfig.label}
        </span>

        {/* iCal source badge */}
        {project.source === 'ical' && (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-cyan-100 text-cyan-700 rounded">
            iCal
          </span>
        )}

        {/* Guest count if available */}
        {project.guestCount && project.guestCount > 0 && (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] text-gray-500 bg-gray-100 rounded">
            {project.guestCount} guests
          </span>
        )}
      </div>
    </div>
  )
}

// Status configuration helper
function getStatusConfig(status: CleaningProjectStatus): {
  label: string
  bg: string
  border: string
  text: string
  badge: string
  icon: React.ReactNode
  iconColor: string
} {
  const configs: Record<CleaningProjectStatus, ReturnType<typeof getStatusConfig>> = {
    pending: {
      label: 'Pending',
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      text: 'text-gray-700',
      badge: 'bg-gray-100 text-gray-600',
      icon: <div className="w-2 h-2 rounded-full bg-gray-400" />,
      iconColor: 'text-gray-400',
    },
    assigned: {
      label: 'Assigned',
      bg: 'bg-blue-50',
      border: 'border-blue-400',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-700',
      icon: <UserCircleIcon className="w-4 h-4" />,
      iconColor: 'text-blue-500',
    },
    confirmed: {
      label: 'Confirmed',
      bg: 'bg-indigo-50',
      border: 'border-indigo-400',
      text: 'text-indigo-700',
      badge: 'bg-indigo-100 text-indigo-700',
      icon: <CheckCircleIcon className="w-4 h-4" />,
      iconColor: 'text-indigo-500',
    },
    in_progress: {
      label: 'In Progress',
      bg: 'bg-purple-50',
      border: 'border-purple-400',
      text: 'text-purple-700',
      badge: 'bg-purple-100 text-purple-700',
      icon: <PlayCircleIcon className="w-4 h-4" />,
      iconColor: 'text-purple-500',
    },
    completed: {
      label: 'Completed',
      bg: 'bg-green-50',
      border: 'border-green-400',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-700',
      icon: <CheckCircleIcon className="w-4 h-4" />,
      iconColor: 'text-green-500',
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      text: 'text-gray-500',
      badge: 'bg-gray-100 text-gray-500',
      icon: <div className="w-2 h-2 rounded-full bg-gray-300" />,
      iconColor: 'text-gray-400',
    },
  }

  return configs[status] || configs.pending
}
