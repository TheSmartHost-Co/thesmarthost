'use client'

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
  alertType?: 'booking' | 'report'
}

export const AlertCard: React.FC<AlertCardProps> = ({
  propertyName,
  lastUploadDate,
  daysSinceLastUpload,
  onUploadClick,
  onPropertyClick,
  onDismiss,
  actionButtonText = 'Upload CSV',
  alertType = 'booking',
}) => {
  const formattedDate = lastUploadDate
    ? new Date(lastUploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Never'

  const dateLabel = alertType === 'report' ? 'Last report' : 'Last upload'

  return (
    <div
      className="group flex items-center justify-between gap-2 py-2 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={onPropertyClick}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <HomeModernIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">{propertyName}</p>
          <p className="text-xs text-slate-400">
            {dateLabel}: {formattedDate}
            {daysSinceLastUpload !== null && ` · ${daysSinceLastUpload}d ago`}
          </p>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onUploadClick()
        }}
        className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100 cursor-pointer"
      >
        {actionButtonText}
      </button>
    </div>
  )
}
