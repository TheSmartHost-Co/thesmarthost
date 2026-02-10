'use client'

import React from 'react'
import {
  CalendarDaysIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import type { DataSource } from '@/services/types/reportTemplate'

interface DataSourceSelectorProps {
  dataSource: DataSource
  onChange: (dataSource: DataSource) => void
  disabled?: boolean
}

const DATA_SOURCES: {
  value: DataSource
  label: string
  icon: typeof CalendarDaysIcon
  description: string
}[] = [
  {
    value: 'booking',
    label: 'Bookings',
    icon: CalendarDaysIcon,
    description: 'Display booking records with guest info, dates, and financial data',
  },
  {
    value: 'expense',
    label: 'Expenses',
    icon: CurrencyDollarIcon,
    description: 'Display expense records with categories and amounts',
  },
]

const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  dataSource,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700">Data Source</span>
      </div>
      <div className="inline-flex bg-gray-100 rounded-lg p-1">
        {DATA_SOURCES.map((source) => {
          const isSelected = dataSource === source.value
          const Icon = source.icon

          return (
            <button
              key={source.value}
              type="button"
              onClick={() => onChange(source.value)}
              disabled={disabled}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={source.description}
            >
              <Icon className="w-4 h-4" />
              {source.label}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {DATA_SOURCES.find((s) => s.value === dataSource)?.description}
      </p>
    </div>
  )
}

export default DataSourceSelector
