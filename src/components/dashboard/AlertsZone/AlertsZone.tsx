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
  onGenerateReport?: (propertyId: string) => void
}

export const AlertsZone: React.FC<AlertsZoneProps> = ({
  missingBookings,
  missingReports,
  showQuickActions,
  onGenerateReport,
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

  // Show top 5 of each alert type
  const visibleMissingBookings = missingBookings.slice(0, 5)
  const visibleMissingReports = missingReports.slice(0, 5)

  return (
    <div className="mt-6 space-y-4">
      {/* Missing Bookings */}
      {missingBookings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Properties Without Bookings
                </h3>
                <p className="text-xs text-gray-600">Current month missing data</p>
              </div>
              <span className="ml-2 px-2.5 py-1 bg-amber-200 text-amber-800 rounded-lg text-xs font-semibold">
                {missingBookings.length}
              </span>
            </div>
            {missingBookings.length > 5 && (
              <button
                onClick={() => router.push('/property-manager/properties')}
                className="text-sm text-amber-700 hover:text-amber-800 font-semibold transition-colors"
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
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Properties Without Reports
                </h3>
                <p className="text-xs text-gray-600">Current month missing reports</p>
              </div>
              <span className="ml-2 px-2.5 py-1 bg-amber-200 text-amber-800 rounded-lg text-xs font-semibold">
                {missingReports.length}
              </span>
            </div>
            {missingReports.length > 5 && (
              <button
                onClick={() => router.push('/property-manager/reports')}
                className="text-sm text-amber-700 hover:text-amber-800 font-semibold transition-colors"
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
                onUploadClick={() => onGenerateReport?.(alert.propertyId)}
                onPropertyClick={() => handlePropertyClick(alert.propertyId)}
                showQuickActions={showQuickActions}
                actionButtonText="Generate Report"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
