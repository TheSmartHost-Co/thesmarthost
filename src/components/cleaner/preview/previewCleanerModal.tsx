'use client'

import React from 'react'
import Modal from '../../shared/modal'
import { Cleaner } from '@/services/types/cleaner'
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  PencilIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'

interface PreviewCleanerModalProps {
  isOpen: boolean
  onClose: () => void
  cleaner: Cleaner
  onEditCleaner: () => void
  onAssignProperties: () => void
  onResendInvite?: () => void
}

const PreviewCleanerModal: React.FC<PreviewCleanerModalProps> = ({
  isOpen,
  onClose,
  cleaner,
  onEditCleaner,
  onAssignProperties,
  onResendInvite,
}) => {
  const formatTurnaroundTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins} minutes`
    if (mins === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
    return `${hours}h ${mins}m`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusBadge = () => {
    switch (cleaner.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Active
          </span>
        )
      case 'invited':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Invited
          </span>
        )
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            Inactive
          </span>
        )
    }
  }

  const assignedCount = cleaner.assignedProperties?.length || 0
  const defaultProperty = cleaner.assignedProperties?.find(p => p.isDefault)

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-2xl w-11/12">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 h-14 w-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold text-white">
              {cleaner.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{cleaner.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              {getStatusBadge()}
              <span className="text-sm text-gray-500">Added {formatDate(cleaner.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Contact Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <EnvelopeIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">
                {cleaner.email || <span className="text-gray-400">Not provided</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <PhoneIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="text-sm font-medium text-gray-900">
                {cleaner.phone || <span className="text-gray-400">Not provided</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Work Details */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Work Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Default Turnaround</p>
              <p className="text-sm font-medium text-gray-900">
                {formatTurnaroundTime(cleaner.defaultTurnaroundMinutes)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Hourly Rate</p>
              <p className="text-sm font-medium text-gray-900">
                {cleaner.hourlyRate ? `$${cleaner.hourlyRate.toFixed(2)}/hr` : <span className="text-gray-400">Not set</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Property Assignments */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Property Assignments ({assignedCount})
        </h3>
        {assignedCount > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {cleaner.assignedProperties?.map((property) => (
              <div
                key={property.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BuildingOfficeIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {property.propertyName || 'Unknown Property'}
                    </p>
                    {property.propertyAddress && (
                      <p className="text-xs text-gray-500">{property.propertyAddress}</p>
                    )}
                  </div>
                </div>
                {property.isDefault && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    <CheckCircleIcon className="h-3 w-3" />
                    Default
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <BuildingOfficeIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No properties assigned yet</p>
            <button
              onClick={onAssignProperties}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Assign properties
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Quick Actions
        </h3>
        <div className={`grid gap-3 ${cleaner.email && cleaner.authUserId && onResendInvite ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <button
            onClick={onAssignProperties}
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Manage Properties</span>
          </button>
          <button
            onClick={onEditCleaner}
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <PencilIcon className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Edit Details</span>
          </button>
          {cleaner.email && cleaner.authUserId && onResendInvite && (
            <button
              onClick={onResendInvite}
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <PaperAirplaneIcon className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Resend Invite</span>
            </button>
          )}
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
          onClick={onEditCleaner}
          className="inline-flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PencilIcon className="h-4 w-4 mr-2" />
          Edit Cleaner
        </button>
      </div>
    </Modal>
  )
}

export default PreviewCleanerModal
