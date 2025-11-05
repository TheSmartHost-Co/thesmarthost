'use client'

import React from 'react'
import Modal from '../../shared/modal'
import { Property } from '@/services/types/property'
import { hasCommissionOverride, getEffectiveCommissionRate } from '@/services/propertyService'
import { HomeIcon, StarIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface PreviewPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  property: Property
  onAddCoOwner: () => void
  onViewFullDetails?: () => void
}

const PreviewPropertyModal: React.FC<PreviewPropertyModalProps> = ({
  isOpen,
  onClose,
  property,
  onAddCoOwner,
  onViewFullDetails,
}) => {
  const getTypeBadge = (type: 'STR' | 'LTR') => {
    if (type === 'STR') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          STR
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        LTR
      </span>
    )
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Inactive
      </span>
    )
  }

  // Get initials from client name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-3xl w-11/12">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <HomeIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{property.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{property.address}</p>
          </div>
        </div>
      </div>

      {/* Property Details Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
        <div>
          <p className="text-sm text-gray-600">Province</p>
          <p className="text-base font-medium text-gray-900">{property.province}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Property Type</p>
          <div className="mt-1">{getTypeBadge(property.propertyType)}</div>
        </div>
        <div>
          <p className="text-sm text-gray-600">Commission Rate</p>
          <p className="text-base font-medium text-gray-900">{property.commissionRate}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Status</p>
          <div className="mt-1">{getStatusBadge(property.isActive)}</div>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-gray-600">Hostaway Listing ID</p>
          <p className="text-base font-medium text-gray-900">{property.hostawayListingId}</p>
        </div>
      </div>

      {/* Owners Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Property Owners ({property.owners.length})
        </h3>

        {/* Owners Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {property.owners.map((owner) => {
            const effectiveRate = getEffectiveCommissionRate(owner, property.commissionRate)
            const hasOverride = hasCommissionOverride(owner)

            return (
              <div
                key={owner.clientId}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                {/* Avatar and Name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {getInitials(owner.clientName)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {owner.clientName}
                      </p>
                      {owner.isPrimary && (
                        <StarIconSolid className="h-4 w-4 text-amber-500" title="Primary Owner" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Commission Rate */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Commission Rate:</span>
                    <span className="text-sm font-semibold text-gray-900">{effectiveRate}%</span>
                  </div>
                  {hasOverride && (
                    <div className="flex items-center gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        Override
                      </span>
                      <span className="text-xs text-gray-500">
                        (Default: {property.commissionRate}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Add Co-Owner Button */}
        <button
          type="button"
          onClick={onAddCoOwner}
          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
        >
          <UserPlusIcon className="h-5 w-5" />
          <span className="font-medium">Add Co-Owner</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
        {onViewFullDetails && (
          <button
            type="button"
            onClick={onViewFullDetails}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Full Details
          </button>
        )}
      </div>
    </Modal>
  )
}

export default PreviewPropertyModal