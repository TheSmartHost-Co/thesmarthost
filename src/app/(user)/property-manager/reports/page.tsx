'use client'

import { useState, useEffect } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getProperties } from '@/services/propertyService'
import {
  generatePropertyReportCSV,
  generatePropertyReportExcel,
  generatePropertyReportPDF,
} from '@/services/reportService'
import type { Property } from '@/services/types/property'
import type { ReportData } from '@/services/types/report'

type ReportFormat = 'csv' | 'excel' | 'pdf'

export default function ReportsPage() {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  // Form state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Data state
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState<boolean>(true)

  // Report generation state
  const [generatingReport, setGeneratingReport] = useState<ReportFormat | null>(null)
  const [lastGeneratedReport, setLastGeneratedReport] = useState<ReportData | null>(null)

  // Load properties on mount
  useEffect(() => {
    if (profile?.id) {
      loadProperties()
    }
  }, [profile])

  const loadProperties = async () => {
    try {
      setLoadingProperties(true)
      const res = await getProperties(profile!.id)
      if (res.status === 'success') {
        setProperties(res.data || [])
      } else {
        showNotification(res.message || 'Failed to load properties', 'error')
      }
    } catch (err) {
      console.error('Error loading properties:', err)
      showNotification('Failed to load properties', 'error')
    } finally {
      setLoadingProperties(false)
    }
  }

  const validateForm = (): boolean => {
    // Required fields
    if (!selectedPropertyId) {
      showNotification('Please select a property', 'error')
      return false
    }
    if (!startDate) {
      showNotification('Start date is required', 'error')
      return false
    }
    if (!endDate) {
      showNotification('End date is required', 'error')
      return false
    }

    // Date validation
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start > end) {
      showNotification('Start date must be before end date', 'error')
      return false
    }

    // Max 1 year range
    const oneYearLater = new Date(start)
    oneYearLater.setFullYear(start.getFullYear() + 1)
    
    if (end > oneYearLater) {
      showNotification('Date range cannot exceed 1 year', 'error')
      return false
    }

    return true
  }

  const handleGenerateReport = async (format: ReportFormat) => {
    if (!validateForm()) return

    try {
      setGeneratingReport(format)
      setLastGeneratedReport(null)

      const payload = {
        propertyId: selectedPropertyId,
        startDate,
        endDate,
      }

      let res
      switch (format) {
        case 'csv':
          res = await generatePropertyReportCSV(payload)
          break
        case 'excel':
          res = await generatePropertyReportExcel(payload)
          break
        case 'pdf':
          res = await generatePropertyReportPDF(payload)
          break
      }

      if (res.status === 'success') {
        setLastGeneratedReport(res.data)
        showNotification(
          `${format.toUpperCase()} report generated successfully!`,
          'success'
        )
      } else {
        showNotification(res.message || 'Failed to generate report', 'error')
      }
    } catch (err) {
      console.error('Error generating report:', err)
      const message = err instanceof Error ? err.message : 'Failed to generate report'
      showNotification(message, 'error')
    } finally {
      setGeneratingReport(null)
    }
  }

  const handleDownload = () => {
    if (lastGeneratedReport?.downloadUrl) {
      window.open(lastGeneratedReport.downloadUrl, '_blank')
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Generate Reports</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">
            {/* Property Selection */}
            <div>
              <label htmlFor="property" className="block text-sm font-medium text-gray-700 mb-2">
                Property
              </label>
              {loadingProperties ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100">
                  Loading properties...
                </div>
              ) : (
                <select
                  id="property"
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={properties.length === 0}
                >
                  <option value="">Select a property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.listingName} ({property.address})
                    </option>
                  ))}
                </select>
              )}
              {!loadingProperties && properties.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No properties found</p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Generate Buttons */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Export Options</h3>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleGenerateReport('csv')}
                  disabled={generatingReport !== null}
                  className="px-4 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {generatingReport === 'csv' ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </div>
                  ) : (
                    'Generate CSV Report'
                  )}
                </button>
                
                <button
                  onClick={() => handleGenerateReport('excel')}
                  disabled={generatingReport !== null}
                  className="px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {generatingReport === 'excel' ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </div>
                  ) : (
                    'Generate Excel Report'
                  )}
                </button>
                
                <button
                  onClick={() => handleGenerateReport('pdf')}
                  disabled={generatingReport !== null}
                  className="px-4 py-3 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {generatingReport === 'pdf' ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </div>
                  ) : (
                    'Generate PDF Report'
                  )}
                </button>
              </div>
            </div>

            {/* Download Section */}
            {lastGeneratedReport && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-green-800">Report Generated Successfully!</h4>
                    <p className="text-sm text-green-600">
                      Report ID: {lastGeneratedReport.reportId}
                    </p>
                    <p className="text-sm text-green-600">
                      Period: {lastGeneratedReport.reportingPeriod}
                    </p>
                    <p className="text-sm text-green-600">
                      Generated: {new Date(lastGeneratedReport.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Download Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}