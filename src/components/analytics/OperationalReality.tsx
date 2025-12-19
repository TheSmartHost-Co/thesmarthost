'use client'

import type { AnalyticsBookingsData } from '@/store/useAnalyticsStore'
import { 
  ClockIcon, 
  HomeIcon, 
  DocumentChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface OperationalRealityProps {
  data: AnalyticsBookingsData | null
  isLoading: boolean
  error: string | null
}

export function OperationalReality({ data, isLoading, error }: OperationalRealityProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-700">
          <h3 className="font-medium">Unable to load operational data</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="text-center text-gray-500">
          <p>No operational data available for the selected filters</p>
        </div>
      </div>
    )
  }

  const { operational_stats, data_integrity } = data

  const getStayLengthCategory = (category: string) => {
    switch (category) {
      case 'one_night': return 'Single Night'
      case 'short_stays': return 'Short Stays (2-3 nights)'
      case 'medium_stays': return 'Medium Stays (4-7 nights)'
      case 'long_stays': return 'Long Stays (8+ nights)'
      default: return category
    }
  }

  const getDataCompletenessStatus = () => {
    const missing = data_integrity.data_completeness.missing_guest_names + 
                   data_integrity.data_completeness.missing_reservation_codes
    
    if (missing === 0) {
      return { status: 'complete', color: 'text-green-600', icon: CheckCircleIcon }
    } else if (missing <= 2) {
      return { status: 'minor_issues', color: 'text-yellow-600', icon: ExclamationTriangleIcon }
    } else {
      return { status: 'issues', color: 'text-red-600', icon: ExclamationTriangleIcon }
    }
  }

  const completenessStatus = getDataCompletenessStatus()
  const Completeness = completenessStatus.icon

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Booking Volume & Stay Length */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <HomeIcon className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Booking Volume & Stay Patterns</h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-blue-700 font-medium">Total Reservations</div>
              <div className="text-2xl font-bold text-blue-900">
                {operational_stats.total_reservations.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-green-700 font-medium">Avg Nights per Stay</div>
              <div className="text-2xl font-bold text-green-900">
                {operational_stats.avg_nights_per_stay.toFixed(1)}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Stay Length Distribution</h4>
            <div className="space-y-2">
              {Object.entries(operational_stats.stay_length_distribution).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{getStayLengthCategory(category)}</span>
                  <div className="flex items-center">
                    <div className="w-16 text-right font-medium text-gray-900">{count}</div>
                    <div className="w-20 ml-2">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ 
                            width: `${operational_stats.total_reservations > 0 
                              ? (count / operational_stats.total_reservations) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center text-sm text-gray-700">
              <ClockIcon className="w-4 h-4 mr-2" />
              <span className="font-medium">Turnover Impact:</span>
              <span className="ml-2">
                {operational_stats.turnover_metrics.avg_turnovers_per_week.toFixed(1)} 
                {' '}turnovers/week across {operational_stats.turnover_metrics.weeks_with_bookings} weeks
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Integrity & Trust Signals */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <DocumentChartBarIcon className="w-5 h-5 text-green-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Data Integrity & Sources</h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-purple-700 font-medium">CSV Imported</div>
              <div className="text-2xl font-bold text-purple-900">
                {data_integrity.csv_imported}
              </div>
              <div className="text-xs text-purple-600">
                ({data_integrity.csv_import_pct.toFixed(1)}%)
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-orange-700 font-medium">Manually Added</div>
              <div className="text-2xl font-bold text-orange-900">
                {data_integrity.manually_added}
              </div>
              <div className="text-xs text-orange-600">
                ({(100 - data_integrity.csv_import_pct).toFixed(1)}%)
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total Bookings</span>
              <span className="font-medium text-gray-900">
                {data_integrity.total_bookings.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">CSV Upload Sources</span>
              <span className="font-medium text-gray-900">
                {data_integrity.unique_csv_uploads} files
              </span>
            </div>

            <div className={`flex items-center justify-between text-sm ${completenessStatus.color}`}>
              <div className="flex items-center">
                <Completeness className="w-4 h-4 mr-2" />
                <span>Data Completeness</span>
              </div>
              <span className="font-medium">
                {completenessStatus.status === 'complete' && 'Complete'}
                {completenessStatus.status === 'minor_issues' && 'Minor Issues'}
                {completenessStatus.status === 'issues' && 'Has Issues'}
              </span>
            </div>

            {(data_integrity.data_completeness.missing_guest_names > 0 || 
              data_integrity.data_completeness.missing_reservation_codes > 0) && (
              <div className="text-xs text-gray-500 space-y-1 pl-6">
                {data_integrity.data_completeness.missing_guest_names > 0 && (
                  <div>• {data_integrity.data_completeness.missing_guest_names} missing guest names</div>
                )}
                {data_integrity.data_completeness.missing_reservation_codes > 0 && (
                  <div>• {data_integrity.data_completeness.missing_reservation_codes} missing reservation codes</div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600">
              <div className="font-medium mb-1">Trust Signal</div>
              <div>
                These numbers are reviewed and auditable through 
                {data_integrity.csv_imported > 0 && ' CSV imports'}
                {data_integrity.csv_imported > 0 && data_integrity.manually_added > 0 && ' and'}
                {data_integrity.manually_added > 0 && ' manual entries'}
                .
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}