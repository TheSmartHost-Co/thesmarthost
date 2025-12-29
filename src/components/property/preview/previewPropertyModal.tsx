'use client'

import React from 'react'
import Modal from '../../shared/modal'
import { Property } from '@/services/types/property'
import {
  HomeIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserGroupIcon,
  SignalIcon,
  DocumentTextIcon,
  PencilIcon,
  HashtagIcon,
  TagIcon,
} from '@heroicons/react/24/outline'

interface PreviewPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  property: Property
  onEditProperty: () => void
  onManageLicenses?: () => void
  onManageChannels?: () => void
  onManageOwners?: () => void
}

const PreviewPropertyModal: React.FC<PreviewPropertyModalProps> = ({
  isOpen,
  onClose,
  property,
  onEditProperty,
  onManageLicenses,
  onManageChannels,
  onManageOwners,
}) => {
  // Use stored license count from property data
  const licenseCount = property.licenses?.length || 0
  const channelCount = property.channels?.length || 0

  // Get primary owner name
  const primaryOwner = property.owners.find(o => o.isPrimary)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadge = () => {
    if (property.isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          Active
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        Inactive
      </span>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-3xl w-11/12">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className={`shrink-0 h-14 w-14 rounded-xl flex items-center justify-center shadow-lg ${
            property.propertyType === 'STR'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600'
              : 'bg-gradient-to-br from-purple-500 to-purple-600'
          }`}>
            {property.propertyType === 'STR' ? (
              <HomeIcon className="h-7 w-7 text-white" />
            ) : (
              <BuildingOfficeIcon className="h-7 w-7 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{property.listingName}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                property.propertyType === 'STR'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {property.propertyType === 'STR' ? 'Short-Term Rental' : 'Long-Term Rental'}
              </span>
              {getStatusBadge()}
              <span className="text-sm text-gray-500">
                Added {formatDate(property.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Property Information */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Property Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <HashtagIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Listing ID</p>
              <p className="text-sm font-medium text-gray-900 font-mono">{property.listingId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-amber-600">%</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Commission Rate</p>
              <p className="text-sm font-medium text-gray-900">{property.commissionRate}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Primary Owner</p>
              <p className="text-sm font-medium text-gray-900">
                {primaryOwner?.clientName || <span className="text-gray-400">No owner</span>}
              </p>
              {property.owners.length > 1 && (
                <p className="text-xs text-gray-500">
                  +{property.owners.length - 1} co-owner{property.owners.length > 2 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <MapPinIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium text-gray-900">{property.address}</p>
              <p className="text-xs text-gray-500">{property.postalCode}, {property.province}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Listing Names */}
      {(property.externalName || property.internalName) && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Listing Names
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {property.externalName && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TagIcon className="h-5 w-5 text-cyan-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">External Name (Public)</p>
                  <p className="text-sm font-medium text-gray-900 break-words">{property.externalName}</p>
                </div>
              </div>
            )}
            {property.internalName && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TagIcon className="h-5 w-5 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Internal Name (Private)</p>
                  <p className="text-sm font-medium text-gray-900 break-words">{property.internalName}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={onManageLicenses}
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-all"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Licenses</span>
            <span className="text-xs text-gray-500">{licenseCount} document{licenseCount !== 1 ? 's' : ''}</span>
          </button>
          <button
            onClick={onManageChannels}
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <SignalIcon className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Channels</span>
            <span className="text-xs text-gray-500">{channelCount} connected</span>
          </button>
          <button
            onClick={onManageOwners}
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Owners</span>
            <span className="text-xs text-gray-500">{property.owners.length} owner{property.owners.length !== 1 ? 's' : ''}</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onEditProperty}
          className="inline-flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PencilIcon className="h-4 w-4 mr-2" />
          Edit Property
        </button>
      </div>
    </Modal>
  )
}

export default PreviewPropertyModal
