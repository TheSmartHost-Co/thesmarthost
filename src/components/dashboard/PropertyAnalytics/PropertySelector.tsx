'use client'

import { useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import type { Property } from '@/services/types/property'

interface PropertySelectorProps {
  properties: Property[]
  selectedPropertyIds: string[]
  onSelectionChange: (propertyIds: string[]) => void
}

export function PropertySelector({
  properties,
  selectedPropertyIds,
  onSelectionChange
}: PropertySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredProperties = properties.filter(property =>
    property.listingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleToggle = (propertyId: string) => {
    if (selectedPropertyIds.includes(propertyId)) {
      onSelectionChange(selectedPropertyIds.filter(id => id !== propertyId))
    } else {
      onSelectionChange([...selectedPropertyIds, propertyId])
    }
  }

  const handleSelectAll = () => {
    onSelectionChange(filteredProperties.map(p => p.id))
  }

  const handleDeselectAll = () => {
    onSelectionChange([])
  }

  const selectedCount = selectedPropertyIds.length
  const totalCount = properties.length
  const isAllSelected = selectedCount === totalCount && totalCount > 0

  return (
    <div className="space-y-3">
      {/* Header with selection count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {selectedCount === 0 ? (
            <span>All properties selected <span className="text-gray-400">({totalCount})</span></span>
          ) : (
            <span>
              <span className="font-semibold text-blue-600">{selectedCount}</span> of {totalCount} selected
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            disabled={isAllSelected}
            className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleDeselectAll}
            disabled={selectedCount === 0}
            className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Search input */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search properties..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Scrollable property list */}
      <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
        {filteredProperties.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No properties found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredProperties.map((property) => {
              const isSelected = selectedPropertyIds.includes(property.id)
              return (
                <label
                  key={property.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(property.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {property.listingName}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {property.address}
                    </div>
                  </div>
                  {!property.isActive && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                      Inactive
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
