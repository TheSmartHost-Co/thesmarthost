'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDownIcon, CheckIcon, MagnifyingGlassIcon, MapIcon } from '@heroicons/react/24/outline'
import type { IncomingBooking } from '@/services/types/incomingBooking'
import SearchableSelect from './SearchableSelect'
import { 
  extractWebhookValue, 
  validateWebhookFieldMappings, 
  suggestWebhookMappings,
  getFieldMappingPreview
} from '@/utils/webhookFieldProcessor'

// Standard booking fields that webhooks should map to
export const WEBHOOK_BOOKING_FIELDS = [
  // Required fields
  { field: 'guestName', label: 'Guest Name', required: true, category: 'guest' },
  { field: 'guestEmail', label: 'Guest Email', required: false, category: 'guest' },
  { field: 'checkInDate', label: 'Check-in Date', required: true, category: 'dates' },
  { field: 'checkOutDate', label: 'Check-out Date', required: true, category: 'dates' },
  { field: 'numNights', label: 'Number of Nights', required: true, category: 'dates' },
  { field: 'listingName', label: 'Property/Listing Name', required: true, category: 'property' },
  { field: 'platform', label: 'Booking Platform', required: true, category: 'booking' },
  { field: 'totalAmount', label: 'Total Amount', required: true, category: 'financial' },
  
  // Financial fields
  { field: 'nightlyRate', label: 'Nightly Rate', required: false, category: 'financial' },
  { field: 'cleaningFee', label: 'Cleaning Fee', required: false, category: 'financial' },
  { field: 'lodgingTax', label: 'Lodging Tax', required: false, category: 'financial' },
  { field: 'salesTax', label: 'Sales Tax', required: false, category: 'financial' },
  { field: 'gst', label: 'GST', required: false, category: 'financial' },
  { field: 'qst', label: 'QST', required: false, category: 'financial' },
  { field: 'channelFee', label: 'Channel Fee', required: false, category: 'financial' },
  { field: 'stripeFee', label: 'Stripe Fee', required: false, category: 'financial' },
  { field: 'totalPayout', label: 'Total Payout', required: false, category: 'financial' },
  { field: 'mgmtFee', label: 'Management Fee', required: false, category: 'financial' },
  { field: 'netEarnings', label: 'Net Earnings', required: false, category: 'financial' },
  { field: 'extraGuestFees', label: 'Extra Guest Fees', required: false, category: 'financial' },
  { field: 'bedLinenFee', label: 'Bed Linen Fee', required: false, category: 'financial' },
] as const

export interface WebhookFieldMapping {
  bookingField: string
  webhookPath: string
  isRequired: boolean
}

interface WebhookFieldMappingFormProps {
  webhookData: Record<string, any>
  initialMappings?: Record<string, string>
  onMappingsChange: (mappings: Record<string, string>) => void
  onValidationChange: (isValid: boolean) => void
}

const WebhookFieldMappingForm: React.FC<WebhookFieldMappingFormProps> = ({
  webhookData,
  initialMappings = {},
  onMappingsChange,
  onValidationChange
}) => {
  const [mappings, setMappings] = useState<Record<string, string>>(initialMappings)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['guest', 'dates', 'booking']))
  
  // Extract all possible paths from webhook data
  const [availablePaths, setAvailablePaths] = useState<string[]>([])

  useEffect(() => {
    let paths = extractWebhookPaths(webhookData)
    
    // Auto-suggest mappings for webhook structure
    if (Object.keys(initialMappings).length === 0) {
      const autoMappings = suggestWebhookMappings(webhookData)
      
      // Filter auto-mappings to only include paths that actually exist in the webhook data
      const validMappings: Record<string, string> = {}
      Object.entries(autoMappings).forEach(([field, path]) => {
        const value = extractWebhookValue(webhookData, path)
        if (value !== undefined && value !== null) {
          validMappings[field] = path
          // Add the valid auto-suggested paths to available paths if they're not already there
          if (!paths.includes(path)) {
            paths.push(path)
          }
        }
      })
      
      console.log('Auto-suggested mappings:', autoMappings)
      console.log('Valid mappings:', validMappings)
      console.log('Available paths total:', paths.length)
      console.log('Sample paths:', paths.slice(0, 20))
      
      setMappings(validMappings)
      onMappingsChange(validMappings)
    }
    
    // Add common finance field paths for Hostaway if they exist
    if (webhookData?.data?.financeField && Array.isArray(webhookData.data.financeField)) {
      const financeFieldPaths = [
        'data.financeField.find(f => f.name === "baseRate").total',
        'data.financeField.find(f => f.name === "cleaningFee").total',
        'data.financeField.find(f => f.name === "lodgingTax").total',
        'data.financeField.find(f => f.name === "salesTax").total',
        'data.financeField.find(f => f.name === "vat").total',
        'data.financeField.find(f => f.name === "weeklyDiscount").total',
        'data.financeField.find(f => f.name === "totalPriceFromChannel").total'
      ]
      
      financeFieldPaths.forEach(path => {
        if (!paths.includes(path)) {
          // Only add if this path would actually return a value
          const value = extractWebhookValue(webhookData, path)
          if (value !== undefined && value !== null) {
            paths.push(path)
          }
        }
      })
    }
    
    setAvailablePaths(paths.sort())
  }, [webhookData, initialMappings])

  useEffect(() => {
    // Validate mappings using utility function
    const requiredFieldNames = WEBHOOK_BOOKING_FIELDS.filter(field => field.required).map(field => field.field)
    const validation = validateWebhookFieldMappings(webhookData, mappings, requiredFieldNames)
    
    onValidationChange(validation.isValid)
  }, [mappings, webhookData])

  const extractWebhookPaths = (data: any, prefix = 'data'): string[] => {
    const pathsSet = new Set<string>()
    
    const traverse = (obj: any, currentPath: string, depth = 0) => {
      // Prevent infinite recursion
      if (depth > 10) return
      
      if (obj === null || obj === undefined) {
        pathsSet.add(currentPath)
        return
      }
      
      if (Array.isArray(obj)) {
        // Add the array path itself
        pathsSet.add(currentPath)
        // For arrays, traverse the first element to show structure
        if (obj.length > 0) {
          traverse(obj[0], `${currentPath}[0]`, depth + 1)
        }
      } else if (typeof obj === 'object') {
        // Add the object path itself only if it's not the root
        if (currentPath !== prefix) {
          pathsSet.add(currentPath)
        }
        
        // Traverse object properties
        Object.keys(obj).forEach(key => {
          const newPath = currentPath === prefix ? `${currentPath}.${key}` : `${currentPath}.${key}`
          traverse(obj[key], newPath, depth + 1)
        })
      } else {
        // Leaf values (strings, numbers, booleans)
        pathsSet.add(currentPath)
      }
    }
    
    traverse(data, prefix)
    return Array.from(pathsSet).sort()
  }


  const getPathValue = (data: any, path: string): any => {
    return extractWebhookValue(data, path)
  }

  const handleMappingChange = (fieldName: string, path: string) => {
    const newMappings = { ...mappings, [fieldName]: path }
    setMappings(newMappings)
    onMappingsChange(newMappings)
  }

  // Convert paths to options for SearchableSelect
  const pathOptions = availablePaths.map(path => ({
    value: path,
    label: path
  }))

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const groupedFields = WEBHOOK_BOOKING_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = []
    acc[field.category].push(field)
    return acc
  }, {} as Record<string, typeof WEBHOOK_BOOKING_FIELDS[number][]>)

  const renderMappingRow = (field: typeof WEBHOOK_BOOKING_FIELDS[number]) => {
    const currentMapping = mappings[field.field] || ''
    const currentValue = currentMapping ? getPathValue(webhookData, currentMapping) : undefined
    const isMapped = currentMapping.trim() !== ''
    
    // Debug: Check if current mapping exists in available paths
    const mappingExistsInPaths = availablePaths.includes(currentMapping)
    
    if (currentMapping && !mappingExistsInPaths) {
      console.log(`Field ${field.field}: mapping "${currentMapping}" not found in ${availablePaths.length} available paths`)
      // Check if it exists with different case or slight variation
      const similarPaths = availablePaths.filter(path => 
        path.toLowerCase().includes(currentMapping.toLowerCase().split('.').pop() || '')
      )
      if (similarPaths.length > 0) {
        console.log('Similar paths found:', similarPaths.slice(0, 5))
      }
    }
    
    return (
      <div key={field.field} className="py-3 px-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {isMapped ? (
                <CheckIcon className="h-5 w-5 text-green-500" />
              ) : (
                <div className={`h-5 w-5 rounded-full border-2 ${field.required ? 'border-red-300' : 'border-gray-300'}`} />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{field.label}</span>
                {field.required && (
                  <span className="text-xs text-red-500">Required</span>
                )}
              </div>
              <span className="text-xs text-gray-500">{field.field}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="text-gray-400">→</span>
            <div className="flex-1">
              <SearchableSelect
                value={currentMapping}
                onChange={(value) => handleMappingChange(field.field, value)}
                options={pathOptions}
                placeholder="Select webhook field..."
                className="w-full"
              />
            </div>
          </div>
          {currentValue !== undefined && (
            <div className="ml-6 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border">
              <span className="font-medium">Preview:</span> {String(currentValue)}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900 flex items-center">
          <MapIcon className="h-5 w-5 mr-2" />
          Webhook Field Mapping
        </h4>
      </div>

      <p className="text-sm text-gray-600">
        Map webhook data fields to your standard booking fields. Required fields must be mapped to proceed. Each field has a searchable dropdown to help you find the right webhook field.
      </p>

      {/* Field Categories */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {Object.entries(groupedFields).map(([category, fields]) => {
          const isExpanded = expandedCategories.has(category)
          const categoryMappedCount = fields.filter(f => mappings[f.field]?.trim()).length
          
          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border-b border-gray-200"
              >
                <span className="flex items-center">
                  <ChevronDownIcon className={`h-4 w-4 mr-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  {category.charAt(0).toUpperCase() + category.slice(1)} Fields
                  <span className="ml-2 text-xs text-gray-500">
                    ({categoryMappedCount}/{fields.length} mapped)
                  </span>
                </span>
              </button>
              
              {isExpanded && (
                <div>
                  {fields.map(field => renderMappingRow(field))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Webhook Data Preview */}
      <details className="border border-gray-200 rounded-lg">
        <summary className="px-4 py-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50">
          Raw Webhook Data (for reference)
        </summary>
        <div className="px-4 pb-4 border-t border-gray-200">
          <pre className="text-black text-xs bg-gray-100 p-3 rounded overflow-auto max-h-60">
            {JSON.stringify(webhookData, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  )
}

export default WebhookFieldMappingForm