'use client'

import React from 'react'
import { CheckCircleIcon, CalendarIcon, CurrencyDollarIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface CompleteStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  completionState?: any
  onReset?: () => void
  onComplete?: () => void
}

const CompleteStep: React.FC<CompleteStepProps> = ({
  completionState,
  onReset,
  onCancel,
  onComplete
}) => {
  const router = useRouter()

  const handleGoToBookings = () => {
    // Call the wizard completion handler first, then navigate
    onComplete?.()
    router.push('/property-manager/bookings')
  }

  const handleUploadAnother = () => {
    if (onReset) {
      onReset()
    }
  }

  const stats = completionState?.stats

  return (
    <div className="p-6 space-y-6">
      {/* Success Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <CheckCircleIcon className="h-16 w-16 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Import Complete! 🎉
        </h2>
        <p className="text-lg text-gray-600">
          Your bookings have been successfully imported into the system.
        </p>
      </div>

      {/* Import Statistics */}
      {stats && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            Import Summary
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Bookings Imported */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center">
                <CalendarIcon className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-green-700">Bookings Imported</p>
                  <p className="text-2xl font-bold text-green-900">{stats.bookingsImported}</p>
                </div>
              </div>
            </div>

            {/* Properties Updated */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-green-700">Properties Updated</p>
                  <p className="text-2xl font-bold text-green-900">{stats.propertiesUpdated || 1}</p>
                </div>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-green-700">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${stats.totalRevenue?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div>
                <p className="text-sm text-green-700">Date Range</p>
                <p className="text-sm font-semibold text-green-900">
                  {stats.dateRange?.start} to {stats.dateRange?.end}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.platformBreakdown && Object.keys(stats.platformBreakdown).length} platforms
                </p>
              </div>
            </div>
          </div>

          {/* Platform Breakdown */}
          {stats.platformBreakdown && Object.keys(stats.platformBreakdown).length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-green-700 mb-2">Platform Breakdown:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.platformBreakdown).map(([platform, count]) => (
                  <span
                    key={platform}
                    className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full"
                  >
                    {platform}: {count as number}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        {/* Primary Action */}
        <div className="flex justify-center">
          <button
            onClick={handleGoToBookings}
            className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            Head to Your Bookings Now →
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleUploadAnother}
            className="px-6 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Upload Another CSV
          </button>
          
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">What's Next?</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Review your imported bookings for accuracy</li>
          <li>• Generate financial reports for your property owners</li>
          <li>• Set up automated booking imports for the future</li>
          <li>• Explore analytics and insights from your booking data</li>
        </ul>
      </div>
    </div>
  )
}

export default CompleteStep