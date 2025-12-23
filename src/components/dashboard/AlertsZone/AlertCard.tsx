'use client'

import { useState } from 'react'
import { HomeModernIcon } from '@heroicons/react/24/outline'

interface AlertCardProps {
  propertyName: string
  lastUploadDate: string | null
  daysSinceLastUpload: number | null
  monthMissing: string
  onUploadClick: () => void
  onPropertyClick: () => void
  onDismiss?: () => void
  showQuickActions: boolean
  actionButtonText?: string
}

export const AlertCard: React.FC<AlertCardProps> = ({
  propertyName,
  lastUploadDate,
  daysSinceLastUpload,
  monthMissing,
  onUploadClick,
  onPropertyClick,
  onDismiss,
  showQuickActions,
  actionButtonText = 'Upload CSV',
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showActions, setShowActions] = useState(showQuickActions)

  const formattedDate = lastUploadDate
    ? new Date(lastUploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Never'

  return (
    <div
      className="group bg-white border border-gray-200 px-4 py-3 rounded-xl hover:shadow-md hover:border-amber-300 transition-all duration-200 cursor-pointer"
      onMouseEnter={() => {
        setIsHovered(true)
        if (!showQuickActions) setShowActions(true)
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        if (!showQuickActions) setShowActions(false)
      }}
      onClick={onPropertyClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
            <HomeModernIcon className="w-4 h-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-sm text-gray-900 truncate">{propertyName}</h4>
            <p className="text-xs text-gray-600">
              Last upload: {formattedDate}
              {daysSinceLastUpload !== null && ` (${daysSinceLastUpload} days ago)`}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className={`flex gap-2 flex-shrink-0 transition-opacity duration-200 ${
            showActions ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onUploadClick}
            className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors whitespace-nowrap"
          >
            {actionButtonText}
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
