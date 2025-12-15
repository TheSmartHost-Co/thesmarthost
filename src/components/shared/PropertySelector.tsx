'use client'

import React from 'react'
import { Property } from '@/services/types/property'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface PropertySelectorProps {
  properties: Property[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

const PropertySelector: React.FC<PropertySelectorProps> = ({
  properties,
  value,
  onChange,
  placeholder = 'Select a property',
  required = false,
  disabled = false,
  className = ''
}) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`
          appearance-none w-full px-3 py-2 pr-8 
          border border-gray-300 rounded-lg bg-white
          text-sm text-gray-900 placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
          ${!value ? 'text-gray-500' : 'text-gray-900'}
          ${className}
        `}
      >
        <option value="">{placeholder}</option>
        {properties.map((property) => (
          <option key={property.id} value={property.id}>
            {property.listingName} {property.address && `- ${property.address}`}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )
}

export default PropertySelector