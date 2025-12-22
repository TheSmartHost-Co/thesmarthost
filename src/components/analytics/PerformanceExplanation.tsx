'use client'

import type { AnalyticsSummaryData } from '@/store/useAnalyticsStore'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

interface PerformanceExplanationProps {
  data: AnalyticsSummaryData | null
  isLoading: boolean
  error: string | null
}

export function PerformanceExplanation({ data, isLoading, error }: PerformanceExplanationProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-700">
          <h3 className="font-medium">Unable to load performance explanation</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-48 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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
          <p>No data available for the selected filters</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const { snapshot, changes, channel_mix, property_contribution } = data

  const generateRevenueExplanation = () => {
    if (!changes || Math.abs(changes.revenue_change) < 0.01) {
      return "Revenue remained stable compared to the previous period."
    }

    const revenueDirection = changes.revenue_change > 0 ? 'increased' : 'decreased'
    const revenueAmount = formatCurrency(Math.abs(changes.revenue_change))
    const revenuePct = Math.abs(changes.revenue_change_pct).toFixed(1)

    const nightsDirection = changes.nights_change > 0 ? 'increased' : 'decreased'
    const nightsPct = Math.abs(changes.nights_change_pct).toFixed(1)

    const adrDirection = changes.adr_change > 0 ? 'increased' : 'decreased'  
    const adrPct = Math.abs(changes.adr_change_pct).toFixed(1)

    let primaryDriver = ''
    if (Math.abs(changes.revenue_attribution.nights_driven) > Math.abs(changes.revenue_attribution.adr_driven)) {
      primaryDriver = 'demand (nights booked)'
    } else {
      primaryDriver = 'pricing (ADR)'
    }

    return `Revenue ${revenueDirection} by ${revenueAmount} (${revenuePct}%) compared to the previous period. Nights booked ${nightsDirection} by ${nightsPct}%, while ADR ${adrDirection} by ${adrPct}%, indicating that ${primaryDriver} was the primary driver.`
  }

  const getChannelInsights = () => {
    if (!channel_mix || channel_mix.length === 0) {
      return { dominant: null, highestADR: null, lowestQuality: null }
    }

    const sortedByRevenue = [...channel_mix].sort((a, b) => b.revenue - a.revenue)
    const sortedByADR = [...channel_mix].sort((a, b) => b.adr - a.adr)
    const sortedByQuality = [...channel_mix].sort((a, b) => 
      (b.adr * b.avg_nights_per_stay) - (a.adr * a.avg_nights_per_stay)
    )

    return {
      dominant: sortedByRevenue[0],
      highestADR: sortedByADR[0],
      lowestQuality: sortedByQuality[sortedByQuality.length - 1]
    }
  }

  const getPropertyInsights = () => {
    if (!property_contribution || property_contribution.length <= 1) {
      return { topContributor: null, bottomPerformer: null, outliers: [] }
    }

    const sortedByRevenue = [...property_contribution].sort((a, b) => b.revenue - a.revenue)
    const avgADR = property_contribution.reduce((sum, p) => sum + p.adr, 0) / property_contribution.length

    const outliers = property_contribution.filter(p => 
      Math.abs(p.adr - avgADR) > avgADR * 0.3
    )

    return {
      topContributor: sortedByRevenue[0],
      bottomPerformer: sortedByRevenue[sortedByRevenue.length - 1],
      outliers
    }
  }

  const channelInsights = getChannelInsights()
  const propertyInsights = getPropertyInsights()

  return (
    <div className="space-y-6">
      
      {/* Revenue Change Decomposition */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          {changes && changes.revenue_change > 0 ? (
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-600 mr-2" />
          ) : (
            <ArrowTrendingDownIcon className="w-5 h-5 text-red-600 mr-2" />
          )}
          <h3 className="text-lg font-semibold text-gray-900">Revenue Change Analysis</h3>
        </div>
        
        <p className="text-gray-700 leading-relaxed">
          {generateRevenueExplanation()}
        </p>
        
        {changes && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-blue-700 font-medium">Volume Impact</div>
              <div className="text-blue-600">
                {changes.nights_change > 0 ? '+' : ''}{changes.nights_change} nights 
                ({changes.nights_change_pct > 0 ? '+' : ''}{changes.nights_change_pct.toFixed(1)}%)
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-green-700 font-medium">Pricing Impact</div>
              <div className="text-green-600">
                {changes.adr_change > 0 ? '+' : ''}{formatCurrency(changes.adr_change)} ADR
                ({changes.adr_change_pct > 0 ? '+' : ''}{changes.adr_change_pct.toFixed(1)}%)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Channel Mix Analysis */}
      {channelInsights.dominant && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Performance</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Dominant Channel:</span>
              <span className="font-medium text-gray-900">
                {channelInsights.dominant.platform.toUpperCase()} 
                ({channelInsights.dominant.revenue_share_pct.toFixed(1)}% of revenue)
              </span>
            </div>
            
            {channelInsights.highestADR && channelInsights.highestADR.platform !== channelInsights.dominant.platform && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Highest ADR:</span>
                <span className="font-medium text-gray-900">
                  {channelInsights.highestADR.platform.toUpperCase()} 
                  ({formatCurrency(channelInsights.highestADR.adr)})
                </span>
              </div>
            )}
            
            {channelInsights.lowestQuality && channel_mix.length > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Shortest Stays:</span>
                <span className="font-medium text-gray-900">
                  {channelInsights.lowestQuality.platform.toUpperCase()} 
                  ({channelInsights.lowestQuality.avg_nights_per_stay.toFixed(1)} nights avg)
                </span>
              </div>
            )}
          </div>

          {/* Channel Breakdown */}
          <div className="mt-4">
            <div className="flex space-x-1 h-3 bg-gray-200 rounded-full overflow-hidden">
              {channel_mix.map((channel, index) => (
                <div
                  key={channel.platform}
                  className={`h-full ${
                    index % 4 === 0 ? 'bg-blue-500' :
                    index % 4 === 1 ? 'bg-green-500' :
                    index % 4 === 2 ? 'bg-yellow-500' :
                    'bg-purple-500'
                  }`}
                  style={{ width: `${channel.revenue_share_pct}%` }}
                  title={`${channel.platform}: ${channel.revenue_share_pct.toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap mt-2 gap-3 text-xs">
              {channel_mix.map((channel, index) => (
                <div key={channel.platform} className="flex items-center">
                  <div className={`w-3 h-3 rounded mr-1 ${
                    index % 4 === 0 ? 'bg-blue-500' :
                    index % 4 === 1 ? 'bg-green-500' :
                    index % 4 === 2 ? 'bg-yellow-500' :
                    'bg-purple-500'
                  }`}></div>
                  <span className="text-gray-600">
                    {channel.platform.toUpperCase()} ({channel.revenue_share_pct.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Property Contribution Analysis */}
      {property_contribution && property_contribution.length > 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Performance</h3>
          
          <div className="space-y-3">
            {propertyInsights.topContributor && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Top Contributor:</span>
                <span className="font-medium text-gray-900">
                  {propertyInsights.topContributor.property_name} 
                  ({propertyInsights.topContributor.contribution_pct.toFixed(1)}% of revenue)
                </span>
              </div>
            )}
            
            {propertyInsights.bottomPerformer && property_contribution.length > 2 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Needs Attention:</span>
                <span className="font-medium text-gray-900">
                  {propertyInsights.bottomPerformer.property_name} 
                  ({formatCurrency(propertyInsights.bottomPerformer.adr)} ADR)
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {property_contribution.map((property) => (
              <div key={property.property_id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate">{property.property_name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">{formatCurrency(property.revenue)}</span>
                  <span className="text-gray-500">({property.contribution_pct.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}