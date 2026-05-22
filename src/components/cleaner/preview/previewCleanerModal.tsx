'use client'

import React, { useState } from 'react'
import Modal from '../../shared/modal'
import { Cleaner, CleanerProperty } from '@/services/types/cleaner'
import { assignPropertiesToCleaner } from '@/services/cleanerService'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  EnvelopeIcon,
  PhoneIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  PencilIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface PreviewCleanerModalProps {
  isOpen: boolean
  onClose: () => void
  cleaner: Cleaner
  onEditCleaner?: () => void
  onAssignProperties?: () => void
  onResendInvite?: () => void
  onUpdate?: (updatedCleaner: Cleaner) => void
  embedded?: boolean
}

const PreviewCleanerModal: React.FC<PreviewCleanerModalProps> = ({
  isOpen,
  onClose,
  cleaner,
  onEditCleaner,
  onAssignProperties,
  onResendInvite,
  onUpdate,
  embedded = false,
}) => {
  const { t } = useTranslation('turnover')
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null)
  const [editRateType, setEditRateType] = useState<'flat' | 'hourly' | null>(null)
  const [editRateAmount, setEditRateAmount] = useState<string>('')
  const [isSavingRate, setIsSavingRate] = useState(false)

  const showNotification = useNotificationStore((state) => state.showNotification)

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
            {t('active')}
          </span>
        )
      case 'invited':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {t('invited')}
          </span>
        )
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            {t('inactive')}
          </span>
        )
    }
  }

  const getRateBadge = (property: CleanerProperty) => {
    if (property.rateType === 'flat' && property.rateAmount != null) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          <CurrencyDollarIcon className="h-3 w-3" />
          ${property.rateAmount.toFixed(2)}/cleaning
        </span>
      )
    }
    if (property.rateType === 'hourly' && property.rateAmount != null) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <CurrencyDollarIcon className="h-3 w-3" />
          ${property.rateAmount.toFixed(2)}/hr
        </span>
      )
    }
    if (cleaner.hourlyRate) {
      return (
        <span className="text-xs text-gray-400">
          Global: ${cleaner.hourlyRate.toFixed(2)}/hr
        </span>
      )
    }
    return <span className="text-xs text-amber-500">{t('rateNotSet')}</span>
  }

  const startEditingRate = (property: CleanerProperty) => {
    setEditingPropertyId(property.propertyId)
    setEditRateType(property.rateType || null)
    setEditRateAmount(property.rateAmount != null ? property.rateAmount.toString() : '')
  }

  const cancelEditingRate = () => {
    setEditingPropertyId(null)
    setEditRateType(null)
    setEditRateAmount('')
  }

  const saveRate = async () => {
    if (!cleaner.assignedProperties) return
    setIsSavingRate(true)

    try {
      // Build full assignments array, updating only the edited property's rate
      const assignments = cleaner.assignedProperties.map((prop) => {
        if (prop.propertyId === editingPropertyId) {
          const parsedAmount = editRateAmount.trim() ? parseFloat(editRateAmount) : null
          return {
            propertyId: prop.propertyId,
            isDefault: prop.isDefault,
            priority: prop.priority,
            rateType: editRateType,
            rateAmount: editRateType === null ? null : parsedAmount,
          }
        }
        return {
          propertyId: prop.propertyId,
          isDefault: prop.isDefault,
          priority: prop.priority,
          rateType: prop.rateType || null,
          rateAmount: prop.rateAmount ?? null,
        }
      })

      const res = await assignPropertiesToCleaner(cleaner.id, { assignments })

      if (res.status === 'success') {
        onUpdate?.(res.data)
        showNotification(t('rateUpdated'), 'success')
        cancelEditingRate()
      } else {
        showNotification(res.message || t('failedToUpdateRate'), 'error')
      }
    } catch (err) {
      console.error('Error updating rate:', err)
      showNotification(t('errorUpdatingRate'), 'error')
    } finally {
      setIsSavingRate(false)
    }
  }

  const assignedCount = cleaner.assignedProperties?.length || 0

  const inner = (
    <>
      {embedded && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer z-10"
          aria-label="Close"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      )}
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
          {t('contactInformation')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <EnvelopeIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">
                {cleaner.email || <span className="text-gray-400">{t('notProvided')}</span>}
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
                {cleaner.phone || <span className="text-gray-400">{t('notProvided')}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Work Details */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          {t('workDetails')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('defaultTurnaround')}</p>
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
              <p className="text-xs text-gray-500">{t('globalHourlyRate')}</p>
              <p className="text-sm font-medium text-gray-900">
                {cleaner.hourlyRate ? `$${cleaner.hourlyRate.toFixed(2)}/hr` : <span className="text-gray-400">{t('notSet')}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Property Assignments */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          {t('propertyAssignmentsCount', { count: assignedCount })}
        </h3>
        {assignedCount > 0 ? (
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {cleaner.assignedProperties?.map((property) => (
              <div
                key={property.id}
                className="p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BuildingOfficeIcon className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {property.propertyName || t('unknownPropertyLabel')}
                      </p>
                      {property.propertyAddress && (
                        <p className="text-xs text-gray-500 truncate">{property.propertyAddress}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getRateBadge(property)}
                    {property.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        <CheckCircleIcon className="h-3 w-3" />
                        {t('default')}
                      </span>
                    )}
                    {onUpdate && (
                      <button
                        onClick={() => editingPropertyId === property.propertyId ? cancelEditingRate() : startEditingRate(property)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        title="Edit rate"
                      >
                        <PencilIcon className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Rate Editor */}
                {editingPropertyId === property.propertyId && (
                  <div className="flex items-center gap-2 mt-2 ml-11">
                    {/* Rate Type Toggle */}
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => setEditRateType(null)}
                        className={`px-2 py-1 text-xs font-medium transition-colors ${
                          editRateType === null
                            ? 'bg-gray-600 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        Global
                      </button>
                      <button
                        onClick={() => setEditRateType('flat')}
                        className={`px-2 py-1 text-xs font-medium border-l border-gray-200 transition-colors ${
                          editRateType === 'flat'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        Flat
                      </button>
                      <button
                        onClick={() => setEditRateType('hourly')}
                        className={`px-2 py-1 text-xs font-medium border-l border-gray-200 transition-colors ${
                          editRateType === 'hourly'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        Hourly
                      </button>
                    </div>

                    {editRateType !== null && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editRateAmount}
                          onChange={(e) => setEditRateAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-400">
                          {editRateType === 'flat' ? '/cleaning' : '/hr'}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={saveRate}
                      disabled={isSavingRate}
                      className="p-1 rounded bg-green-100 hover:bg-green-200 transition-colors disabled:opacity-50"
                      title="Save rate"
                    >
                      <CheckIcon className="h-3.5 w-3.5 text-green-700" />
                    </button>
                    <button
                      onClick={cancelEditingRate}
                      className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                      title="Cancel"
                    >
                      <XMarkIcon className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <BuildingOfficeIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{t('noPropertiesAssignedYet')}</p>
            {onAssignProperties && (
              <button
                onClick={onAssignProperties}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('assignPropertiesLink')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {(onAssignProperties || onEditCleaner || onResendInvite) && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            {t('quickActions')}
          </h3>
          <div className={`grid gap-3 ${[onAssignProperties, onEditCleaner, (cleaner.email && cleaner.authUserId && onResendInvite)].filter(Boolean).length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {onAssignProperties && (
              <button
                onClick={onAssignProperties}
                className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BuildingOfficeIcon className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{t('manageProperties')}</span>
              </button>
            )}
            {onEditCleaner && (
              <button
                onClick={onEditCleaner}
                className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <PencilIcon className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{t('editDetails')}</span>
              </button>
            )}
            {cleaner.email && cleaner.authUserId && onResendInvite && (
              <button
                onClick={onResendInvite}
                className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <PaperAirplaneIcon className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{t('resendInvite')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
        {onEditCleaner && (
          <button
            type="button"
            onClick={onEditCleaner}
            className="inline-flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Cleaner
          </button>
        )}
      </div>
    </>
  )

  if (embedded) {
    return <div className="relative p-6">{inner}</div>
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-2xl w-11/12">
      {inner}
    </Modal>
  )
}

export default PreviewCleanerModal
