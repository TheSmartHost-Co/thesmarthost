'use client'

import React, { useState } from 'react'
import type { FieldValidationError } from '@/utils/formulaValidator'
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'

interface ValidationSummaryPanelProps {
  errors: FieldValidationError[]
  warnings: FieldValidationError[]
  onDismiss: () => void
  onNavigateToSection: (sectionId: string) => void
}

const ValidationSummaryPanel: React.FC<ValidationSummaryPanelProps> = ({
  errors,
  warnings,
  onDismiss,
  onNavigateToSection,
}) => {
  const [showWarnings, setShowWarnings] = useState(false)

  // Group errors by section
  const errorsBySection = groupBySection(errors)
  const warningsBySection = groupBySection(warnings)

  const totalErrors = errors.reduce((sum, e) => sum + e.errors.length, 0)
  const totalWarnings = warnings.reduce((sum, w) => sum + w.warnings.length, 0)

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-white border border-red-200 rounded-xl shadow-lg z-30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-200">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
          <span className="text-sm font-semibold text-red-800">
            {totalErrors} validation error{totalErrors !== 1 ? 's' : ''} — fix before saving
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 hover:bg-red-100 rounded transition-colors"
        >
          <XMarkIcon className="w-4 h-4 text-red-600" />
        </button>
      </div>

      {/* Error list */}
      <div className="max-h-48 overflow-y-auto px-4 py-2 space-y-3">
        {Object.entries(errorsBySection).map(([sectionName, sectionErrors]) => (
          <div key={sectionName}>
            <button
              type="button"
              onClick={() => {
                const first = sectionErrors[0]
                if (first?.sectionId) onNavigateToSection(first.sectionId)
              }}
              className="text-xs font-semibold text-gray-700 hover:text-blue-700 transition-colors"
            >
              {sectionName || 'Template'}
            </button>
            <ul className="mt-1 space-y-1">
              {sectionErrors.map((err, idx) => (
                <li key={`${err.fieldId}-${idx}`} className="flex items-start gap-2 text-xs">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <span className="text-gray-600">
                    <span className="font-medium text-gray-800">{err.fieldName}:</span>{' '}
                    {err.errors.join('; ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Warnings section (collapsible) */}
      {totalWarnings > 0 && (
        <div className="border-t border-amber-200 bg-amber-50">
          <button
            type="button"
            onClick={() => setShowWarnings(!showWarnings)}
            className="flex items-center justify-between w-full px-4 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <span>{totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}</span>
            {showWarnings
              ? <ChevronUpIcon className="w-3.5 h-3.5" />
              : <ChevronDownIcon className="w-3.5 h-3.5" />
            }
          </button>
          {showWarnings && (
            <div className="px-4 pb-2 space-y-2">
              {Object.entries(warningsBySection).map(([sectionName, sectionWarnings]) => (
                <div key={sectionName}>
                  <span className="text-xs font-semibold text-gray-600">{sectionName || 'Template'}</span>
                  <ul className="mt-1 space-y-1">
                    {sectionWarnings.map((warn, idx) => (
                      <li key={`${warn.fieldId}-${idx}`} className="flex items-start gap-2 text-xs">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span className="text-gray-600">
                          <span className="font-medium text-gray-700">{warn.fieldName}:</span>{' '}
                          {warn.warnings.join('; ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function groupBySection(items: FieldValidationError[]): Record<string, FieldValidationError[]> {
  const groups: Record<string, FieldValidationError[]> = {}
  for (const item of items) {
    const key = item.sectionName || 'Template'
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return groups
}

export default ValidationSummaryPanel
