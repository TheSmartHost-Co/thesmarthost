'use client'

import { useRouter } from 'next/navigation'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { MissingBookingAlert, MissingReportAlert } from '@/services/types/dashboard'
import { AlertCard } from './AlertCard'
import { AllClearState } from './AllClearState'

interface AlertsZoneProps {
  missingBookings: MissingBookingAlert[]
  missingReports: MissingReportAlert[]
  showQuickActions: boolean
}

export const AlertsZone: React.FC<AlertsZoneProps> = ({
  missingBookings,
  missingReports,
  showQuickActions,
}) => {
  const router = useRouter()

  const hasAlerts = missingBookings.length > 0 || missingReports.length > 0

  if (!hasAlerts) {
    return (
      <div className="mt-6">
        <AllClearState lastChecked={new Date().toISOString()} />
      </div>
    )
  }

  const handleUploadClick = () => {
    router.push('/property-manager/upload-bookings')
  }

  const handlePropertyClick = (propertyId: string) => {
    router.push(`/property-manager/properties`)
  }

  const handleGenerateReport = () => {
    // This will be handled by the parent component
  }

  // Show top 5 of each alert type
  const visibleMissingBookings = missingBookings.slice(0, 5)
  const visibleMissingReports = missingReports.slice(0, 5)

  return (
    <div className="mt-6 space-y-6">
      {/* Missing Bookings */}
      {missingBookings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-semibold text-gray-900">
                Properties Without Bookings for Current Month
              </h3>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs font-medium">
                {missingBookings.length}
              </span>
            </div>
            {missingBookings.length > 5 && (
              <button
                onClick={() => router.push('/property-manager/properties')}
                className="text-sm text-amber-700 hover:text-amber-800 font-medium"
              >
                View All
              </button>
            )}
          </div>

          <div className="space-y-2">
            {visibleMissingBookings.map((alert) => (
              <AlertCard
                key={alert.propertyId}
                propertyName={alert.propertyName}
                lastUploadDate={alert.lastUploadDate}
                daysSinceLastUpload={alert.daysSinceLastUpload}
                monthMissing={alert.monthMissing}
                onUploadClick={handleUploadClick}
                onPropertyClick={() => handlePropertyClick(alert.propertyId)}
                showQuickActions={showQuickActions}
              />
            ))}
          </div>
        </div>
      )}

      {/* Missing Reports */}
      {missingReports.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-semibold text-gray-900">
                Properties Without Reports for Current Month
              </h3>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs font-medium">
                {missingReports.length}
              </span>
            </div>
            {missingReports.length > 5 && (
              <button
                onClick={() => router.push('/property-manager/reports')}
                className="text-sm text-amber-700 hover:text-amber-800 font-medium"
              >
                View All
              </button>
            )}
          </div>

          <div className="space-y-2">
            {visibleMissingReports.map((alert) => (
              <AlertCard
                key={alert.propertyId}
                propertyName={alert.propertyName}
                lastUploadDate={alert.lastUploadDate}
                daysSinceLastUpload={null}
                monthMissing={alert.monthMissing}
                onUploadClick={handleGenerateReport}
                onPropertyClick={() => handlePropertyClick(alert.propertyId)}
                showQuickActions={showQuickActions}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
