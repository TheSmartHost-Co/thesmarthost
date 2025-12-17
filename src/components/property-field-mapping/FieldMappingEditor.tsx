'use client'

import React, { useState, useEffect } from 'react'
import { 
  CodeBracketIcon, 
  WrenchScrewdriverIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import type { Platform } from '@/services/types/csvMapping'
import { ALL_BOOKING_FIELDS } from '@/services/types/csvMapping'

interface FieldMappingEditorProps {
  fieldMappings: Record<Platform, Record<string, string>>
  onChange: (mappings: Record<Platform, Record<string, string>>) => void
  className?: string
}

type EditorMode = 'json' | 'visual'

const FieldMappingEditor: React.FC<FieldMappingEditorProps> = ({
  fieldMappings,
  onChange,
  className = ''
}) => {
  const [editorMode, setEditorMode] = useState<EditorMode>('json')
  const [jsonValue, setJsonValue] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('ALL')

  // Initialize JSON value from props
  useEffect(() => {
    setJsonValue(JSON.stringify(fieldMappings, null, 2))
  }, [fieldMappings])

  const handleJsonChange = (value: string) => {
    setJsonValue(value)
    
    try {
      const parsed = JSON.parse(value)
      
      // Validate structure
      if (typeof parsed !== 'object' || parsed === null) {
        setJsonError('Must be a valid object')
        return
      }

      // Check for valid platforms
      const validPlatforms: Platform[] = [
        'ALL', 'airbnb', 'booking', 'google', 'direct', 
        'wechalet', 'monsieurchalets', 'direct-etransfer', 'vrbo', 'hostaway'
      ]
      
      const invalidPlatforms = Object.keys(parsed).filter(
        platform => !validPlatforms.includes(platform as Platform)
      )
      
      if (invalidPlatforms.length > 0) {
        setJsonError(`Invalid platforms: ${invalidPlatforms.join(', ')}`)
        return
      }

      // Validate platform mappings structure
      for (const [platform, mappings] of Object.entries(parsed)) {
        if (typeof mappings !== 'object' || mappings === null) {
          setJsonError(`Platform "${platform}" must contain an object of field mappings`)
          return
        }
        
        for (const [field, formula] of Object.entries(mappings)) {
          if (typeof formula !== 'string') {
            setJsonError(`Field "${field}" in platform "${platform}" must be a string`)
            return
          }
        }
      }

      setJsonError(null)
      onChange(parsed as Record<Platform, Record<string, string>>)
    } catch (error) {
      setJsonError('Invalid JSON syntax')
    }
  }

  const handleVisualChange = (platform: Platform, field: string, formula: string) => {
    const newMappings = {
      ...fieldMappings,
      [platform]: {
        ...fieldMappings[platform],
        [field]: formula
      }
    }
    
    if (!formula.trim()) {
      delete newMappings[platform][field]
    }
    
    onChange(newMappings)
  }

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonValue)
      const formatted = JSON.stringify(parsed, null, 2)
      setJsonValue(formatted)
      setJsonError(null)
    } catch (error) {
      setJsonError('Cannot format invalid JSON')
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonValue)
      // Could show a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const getExampleTemplate = () => {
    return {
      "ALL": {
        "guest_name": "Guest Name",
        "check_in_date": "Check In",
        "check_out_date": "Check Out",
        "num_nights": "Nights",
        "listing_name": "Property Name",
        "platform": "Channel",
        "total_payout": "Total Amount"
      },
      "airbnb": {
        "mgmt_fee": "[Total Amount] * 0.15",
        "net_earnings": "[Total Amount] * 0.85"
      },
      "hostaway": {
        "nightly_rate": "financeField.find(f => f.name === \"baseRate\").total",
        "cleaning_fee": "financeField.find(f => f.name === \"cleaningFee\").total"
      }
    }
  }

  const loadExample = () => {
    const example = getExampleTemplate()
    const formatted = JSON.stringify(example, null, 2)
    setJsonValue(formatted)
    handleJsonChange(formatted)
  }

  const validateMappings = () => {
    const requiredFields = ['guest_name', 'check_in_date', 'num_nights', 'listing_name', 'platform']
    const allPlatformMappings = fieldMappings['ALL'] || {}
    
    const missingRequired = requiredFields.filter(field => {
      const hasInAll = allPlatformMappings[field] && allPlatformMappings[field].trim()
      const hasInAnyPlatform = Object.values(fieldMappings).some(platformMappings =>
        platformMappings[field] && platformMappings[field].trim()
      )
      return !hasInAll && !hasInAnyPlatform
    })
    
    return {
      isValid: missingRequired.length === 0,
      missingRequired
    }
  }

  const validation = validateMappings()
  const platformsWithMappings = Object.keys(fieldMappings).filter(platform =>
    Object.keys(fieldMappings[platform as Platform]).length > 0
  ) as Platform[]

  const getMappingCount = (platform: Platform): number => {
    return Object.keys(fieldMappings[platform] || {}).length
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">Field Mapping Configuration</h3>
          
          {/* Mode Toggle */}
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setEditorMode('json')}
              className={`px-3 py-1 text-sm rounded transition-colors flex items-center ${
                editorMode === 'json'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CodeBracketIcon className="h-4 w-4 mr-1" />
              JSON Editor
            </button>
            <button
              onClick={() => setEditorMode('visual')}
              className={`px-3 py-1 text-sm rounded transition-colors flex items-center ${
                editorMode === 'visual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <WrenchScrewdriverIcon className="h-4 w-4 mr-1" />
              Visual Editor
            </button>
          </div>
        </div>
        
        {/* Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
              {validation.isValid ? (
                <CheckCircleIcon className="h-4 w-4 mr-1" />
              ) : (
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
              )}
              {validation.isValid ? 'Valid configuration' : `Missing: ${validation.missingRequired.join(', ')}`}
            </div>
            <div className="text-gray-600">
              {platformsWithMappings.length} platforms configured
            </div>
          </div>
          
          {editorMode === 'json' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={loadExample}
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                Load Example
              </button>
              <button
                onClick={formatJson}
                disabled={!!jsonError}
                className="text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
              >
                Format
              </button>
              <button
                onClick={copyToClipboard}
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {editorMode === 'json' ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* JSON Editor */}
            <div className="flex-1 relative min-h-0">
              <textarea
                value={jsonValue}
                onChange={(e) => handleJsonChange(e.target.value)}
                className={`text-black w-full h-full p-4 font-mono text-sm resize-none border-0 focus:outline-none focus:ring-0 ${
                  jsonError ? 'bg-red-50' : ''
                }`}
                style={{ minHeight: '400px' }}
                placeholder="Enter field mapping configuration as JSON..."
              />
              {jsonError && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-100 border-t border-red-200 p-3">
                  <div className="flex items-center text-red-700 text-sm">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{jsonError}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Platform Selector */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform Configuration
              </label>
              <div className="flex flex-wrap gap-2">
                {([
                  'ALL', 'airbnb', 'booking', 'google', 'direct', 
                  'wechalet', 'monsieurchalets', 'direct-etransfer', 'vrbo', 'hostaway'
                ] as Platform[]).map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatform(platform)}
                    className={`text-black px-3 py-1 text-sm rounded-lg border transition-colors ${
                      selectedPlatform === platform
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {platform === 'ALL' ? 'All Platforms' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                    {getMappingCount(platform) > 0 && (
                      <span className="ml-1 text-xs">
                        ({getMappingCount(platform)})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Field Editor */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-4 space-y-3">
                {ALL_BOOKING_FIELDS.map((field) => {
                  const currentValue = fieldMappings[selectedPlatform]?.[field.field] || ''
                  
                  return (
                    <div key={field.field} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                      <div className="flex-shrink-0 w-32">
                        <div className="text-sm font-medium text-gray-900">{field.label}</div>
                        <div className="text-xs text-gray-500">{field.field}</div>
                        {field.required && (
                          <div className="text-xs text-red-500">Required</div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={currentValue}
                          onChange={(e) => handleVisualChange(selectedPlatform, field.field, e.target.value)}
                          placeholder={`Map to CSV column or formula...`}
                          className="text-black w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {currentValue && (
                          <div className="mt-1 text-xs text-gray-600">
                            <EyeIcon className="h-3 w-3 inline mr-1" />
                            Preview: {currentValue}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      {editorMode === 'json' && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <strong>Format:</strong> Organize by platform, then field mappings. Use "ALL" for base mappings, 
            platform-specific keys for overrides. Formulas support calculations like "[Total] * 0.15".
          </div>
        </div>
      )}
    </div>
  )
}

export default FieldMappingEditor