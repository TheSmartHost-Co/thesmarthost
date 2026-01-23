'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { previewTemplate, getReportTemplateById } from '@/services/reportTemplateService'
import { getProperties } from '@/services/propertyService'
import type { FullReportTemplate, EvaluatedSection } from '@/services/types/reportTemplate'
import type { Property } from '@/services/types/property'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import {
  CalendarDaysIcon,
  BuildingOfficeIcon,
  DocumentChartBarIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

interface PreviewReportTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  templateId: string
}

const PreviewReportTemplateModal: React.FC<PreviewReportTemplateModalProps> = ({
  isOpen,
  onClose,
  templateId,
}) => {
  const [template, setTemplate] = useState<FullReportTemplate | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [previewing, setPreviewing] = useState(false)

  // Form state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Preview results
  const [previewResult, setPreviewResult] = useState<{
    template: { id: string; name: string; description: string | null }
    bookingSummary: { totalBookings: number; dateRange: { startDate: string; endDate: string } }
    evaluatedSections: Record<string, EvaluatedSection>
  } | null>(null)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Set default dates (last 30 days)
  useEffect(() => {
    if (isOpen) {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)

      setStartDate(start.toISOString().split('T')[0])
      setEndDate(end.toISOString().split('T')[0])
    }
  }, [isOpen])

  // Load template and properties when modal opens
  useEffect(() => {
    const loadData = async () => {
      if (!isOpen || !templateId || !profile?.id) return

      setLoading(true)
      setPreviewResult(null)

      try {
        const [templateRes, propertiesRes] = await Promise.all([
          getReportTemplateById(templateId),
          getProperties(profile.id),
        ])

        if (templateRes.status === 'success') {
          setTemplate(templateRes.data)
        } else {
          showNotification(templateRes.message || 'Failed to load template', 'error')
          onClose()
          return
        }

        if (propertiesRes.status === 'success') {
          setProperties(propertiesRes.data || [])
          // Auto-select first property
          if (propertiesRes.data && propertiesRes.data.length > 0) {
            setSelectedPropertyId(propertiesRes.data[0].id)
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
        showNotification('Error loading data', 'error')
        onClose()
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isOpen, templateId, profile?.id])

  const handlePreview = async () => {
    if (!profile?.id || !selectedPropertyId || !startDate || !endDate) {
      showNotification('Please select a property and date range', 'error')
      return
    }

    setPreviewing(true)
    setPreviewResult(null)

    try {
      const res = await previewTemplate(templateId, {
        propertyId: selectedPropertyId,
        startDate,
        endDate,
        userId: profile.id,
      })

      if (res.status === 'success') {
        setPreviewResult(res.data)
      } else {
        showNotification(res.message || 'Failed to generate preview', 'error')
      }
    } catch (error) {
      console.error('Error generating preview:', error)
      showNotification('Error generating preview', 'error')
    } finally {
      setPreviewing(false)
    }
  }

  const formatValue = (value: string | number | null, format: string): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'string') return value

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-CA', {
          style: 'currency',
          currency: 'CAD',
        }).format(value)
      case 'percentage':
        return `${(value * 100).toFixed(2)}%`
      case 'number':
        return new Intl.NumberFormat('en-CA').format(value)
      default:
        return String(value)
    }
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-3xl w-[90vw] max-h-[85vh]">
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading preview...</p>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-3xl w-[90vw] max-h-[85vh]">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Preview Template</h2>
          <p className="text-sm text-gray-500 mt-1">
            {template?.name} - See how calculated fields will appear with real booking data
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
          {/* Property selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <BuildingOfficeIcon className="w-4 h-4 inline-block mr-1" />
              Property
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.listingName}
                </option>
              ))}
            </select>
          </div>

          {/* Start date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <CalendarDaysIcon className="w-4 h-4 inline-block mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <CalendarDaysIcon className="w-4 h-4 inline-block mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Generate preview button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewing || !selectedPropertyId || !startDate || !endDate}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {previewing ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Generating Preview...
              </>
            ) : (
              <>
                <DocumentChartBarIcon className="w-5 h-5" />
                Generate Preview
              </>
            )}
          </button>
        </div>

        {/* Preview results */}
        {previewResult && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Total Bookings:</span>{' '}
                  <span className="text-blue-800 font-semibold">
                    {previewResult.bookingSummary.totalBookings}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Period:</span>{' '}
                  <span className="text-blue-800">
                    {new Date(previewResult.bookingSummary.dateRange.startDate).toLocaleDateString()}{' '}
                    - {new Date(previewResult.bookingSummary.dateRange.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Sections */}
            {Object.keys(previewResult.evaluatedSections).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DocumentChartBarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No sections defined in this template</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(previewResult.evaluatedSections)
                  .sort(([, a], [, b]) => a.displayOrder - b.displayOrder)
                  .map(([sectionName, section]) => (
                    <div
                      key={sectionName}
                      className="border border-gray-200 rounded-xl overflow-hidden"
                    >
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900">{sectionName}</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {section.fields
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map((field) => (
                            <div
                              key={field.name}
                              className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                            >
                              <div>
                                <div className="font-medium text-gray-900">{field.name}</div>
                                <div className="text-xs text-gray-500 font-mono">{field.formula}</div>
                              </div>
                              <div className="text-right">
                                {field.error ? (
                                  <div className="flex items-center gap-1 text-red-600">
                                    <ExclamationCircleIcon className="w-4 h-4" />
                                    <span className="text-sm">{field.error}</span>
                                  </div>
                                ) : (
                                  <div className="text-lg font-semibold text-gray-900">
                                    {field.formattedValue || formatValue(field.value, field.format)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Close button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default PreviewReportTemplateModal
