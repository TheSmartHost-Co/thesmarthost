'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  DocumentIcon,
  TableCellsIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline'
import type { SectionMode } from '@/services/types/reportTemplate'

interface SectionTypeSelectorProps {
  mode: SectionMode
  onChange: (mode: SectionMode) => void
  disabled?: boolean
}

const SECTION_TYPES: {
  value: SectionMode
  label: string
  icon: typeof DocumentIcon
  description: string
}[] = [
  {
    value: 'header',
    label: 'Header',
    icon: DocumentIcon,
    description: 'Display metadata like property name, report period, logo',
  },
  {
    value: 'table',
    label: 'Table',
    icon: TableCellsIcon,
    description: 'Show booking or expense records in a table with columns',
  },
  {
    value: 'field',
    label: 'Field',
    icon: CalculatorIcon,
    description: 'Calculate aggregate values from table sections',
  },
]

const SectionTypeSelector: React.FC<SectionTypeSelectorProps> = ({
  mode,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700">Section Type</span>
      </div>
      <div className="flex gap-2">
        {SECTION_TYPES.map((type) => {
          const isSelected = mode === type.value
          const Icon = type.icon

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange(type.value)}
              disabled={disabled}
              className={`flex-1 flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={type.description}
            >
              <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {SECTION_TYPES.find((t) => t.value === mode)?.description}
      </p>
    </div>
  )
}

export default SectionTypeSelector
