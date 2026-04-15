'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { MissingBookingAlert, MissingReportAlert } from '@/services/types/dashboard'
import { AlertCard } from './AlertCard'
import { AllClearState } from './AllClearState'

interface AlertsZoneProps {
  missingBookings: MissingBookingAlert[]
  missingReports: MissingReportAlert[]
  showQuickActions: boolean
  onGenerateReport?: (propertyId: string) => void
}

const AlertSection: React.FC<{
  title: string
  count: number
  children: React.ReactNode
  totalCount: number
  onViewAll?: () => void
}> = ({ title, count, children, totalCount, onViewAll }) => {
  const [expanded, setExpanded] = useState(false)
  const visibleCount = expanded ? totalCount : Math.min(3, totalCount)

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <h3 className="text-sm font-medium text-slate-700">{title}</h3>
          <span className="text-xs font-medium text-slate-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {count}
          </span>
        </div>
      </div>
      <div className="py-1">
        {children}
      </div>
      {totalCount > 3 && (
        <div className="px-4 pb-2.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors cursor-pointer"
          >
            {expanded ? 'Show less' : `Show ${totalCount - 3} more`}
          </button>
        </div>
      )}
    </div>
  )
}

export const AlertsZone: React.FC<AlertsZoneProps> = ({
  missingBookings,
  missingReports,
  showQuickActions,
  onGenerateReport,
}) => {
  const router = useRouter()
  const [bookingsExpanded, setBookingsExpanded] = useState(false)
  const [reportsExpanded, setReportsExpanded] = useState(false)

  const hasAlerts = missingBookings.length > 0 || missingReports.length > 0

  if (!hasAlerts) {
    return <AllClearState lastChecked={new Date().toISOString()} />
  }

  const handleUploadClick = () => {
    router.push('/property-manager/upload-bookings')
  }

  const handlePropertyClick = () => {
    router.push('/property-manager/properties')
  }

  const visibleBookings = bookingsExpanded ? missingBookings : missingBookings.slice(0, 3)
  const visibleReports = reportsExpanded ? missingReports : missingReports.slice(0, 3)

  return (
    <div className="space-y-3">
      {missingBookings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <h3 className="text-sm font-medium text-slate-700">Missing Bookings</h3>
              <span className="text-xs font-medium text-slate-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {missingBookings.length}
              </span>
            </div>
          </div>
          <div className="py-1">
            {visibleBookings.map((alert) => (
              <AlertCard
                key={alert.propertyId}
                propertyName={alert.propertyName}
                lastUploadDate={alert.lastUploadDate}
                daysSinceLastUpload={alert.daysSinceLastUpload}
                monthMissing={alert.monthMissing}
                onUploadClick={handleUploadClick}
                onPropertyClick={() => handlePropertyClick()}
                showQuickActions={showQuickActions}
              />
            ))}
          </div>
          {missingBookings.length > 3 && (
            <div className="px-4 pb-2.5">
              <button
                onClick={() => setBookingsExpanded(!bookingsExpanded)}
                className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors cursor-pointer"
              >
                {bookingsExpanded ? 'Show less' : `Show ${missingBookings.length - 3} more`}
              </button>
            </div>
          )}
        </div>
      )}

      {missingReports.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <h3 className="text-sm font-medium text-slate-700">Missing Reports</h3>
              <span className="text-xs font-medium text-slate-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {missingReports.length}
              </span>
            </div>
          </div>
          <div className="py-1">
            {visibleReports.map((alert) => (
              <AlertCard
                key={alert.propertyId}
                propertyName={alert.propertyName}
                lastUploadDate={alert.lastUploadDate}
                daysSinceLastUpload={null}
                monthMissing={alert.monthMissing}
                onUploadClick={() => onGenerateReport?.(alert.propertyId)}
                onPropertyClick={() => handlePropertyClick()}
                showQuickActions={showQuickActions}
                actionButtonText="Generate Report"
                alertType="report"
              />
            ))}
          </div>
          {missingReports.length > 3 && (
            <div className="px-4 pb-2.5">
              <button
                onClick={() => setReportsExpanded(!reportsExpanded)}
                className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors cursor-pointer"
              >
                {reportsExpanded ? 'Show less' : `Show ${missingReports.length - 3} more`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
