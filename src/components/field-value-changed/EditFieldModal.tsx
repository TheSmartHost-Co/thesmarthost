'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../shared/modal'
import { formatFieldName, isFinancialField } from '@/services/fieldValuesChangedService'
import { formatCurrency } from '@/services/bookingService'
import { PreviewFieldEdit } from '@/services/types/fieldValueChanged'
import { PencilSquareIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

interface EditFieldModalProps {
  isOpen: boolean
  onClose: () => void
  fieldName: string
  originalValue: string
  currentValue?: string
  bookingIndex: number
  bookingInfo: {
    reservationCode: string
    guestName: string
    checkInDate: string
  }
  onSave: (edit: PreviewFieldEdit) => void
}

const EditFieldModal: React.FC<EditFieldModalProps> = ({
  isOpen,
  onClose,
  fieldName,
  originalValue,
  currentValue,
  bookingIndex,
  bookingInfo,
  onSave,
}) => {
  const [newValue, setNewValue] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNewValue(currentValue || originalValue || '')
      setReason('')
      setError(null)
    }
  }, [isOpen, currentValue, originalValue])

  const isFinancial = isFinancialField(fieldName)
  const formattedFieldName = formatFieldName(fieldName)

  const validateValue = (value: string): string | null => {
    if (!value.trim()) {
      return 'Value is required'
    }

    // For financial fields, validate it's a valid number
    if (isFinancial) {
      const num = parseFloat(value.trim())
      if (isNaN(num)) {
        return 'Please enter a valid number'
      }
      if (num < 0) {
        return 'Value cannot be negative'
      }
    }

    return null
  }

  const handleSave = () => {
    const trimmedValue = newValue.trim()
    const validationError = validateValue(trimmedValue)
    
    if (validationError) {
      setError(validationError)
      return
    }

    // Don't save if value hasn't changed
    const currentValueToCompare = currentValue || originalValue
    if (trimmedValue === currentValueToCompare && !reason.trim()) {
      setError('Either change the value or provide a reason for the edit')
      return
    }

    const edit: PreviewFieldEdit = {
      bookingIndex,
      fieldName,
      originalValue: originalValue || '',
      newValue: trimmedValue,
      reason: reason.trim() || undefined
    }

    onSave(edit)
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  // Format display values for financial fields
  const formatDisplayValue = (value: string) => {
    if (!value || !isFinancial) return value
    const num = parseFloat(value)
    return isNaN(num) ? value : formatCurrency(num)
  }

  const hasChanges = newValue.trim() !== (currentValue || originalValue) || reason.trim()

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-lg w-11/12">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-lg">
            {isFinancial ? (
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
            ) : (
              <PencilSquareIcon className="h-6 w-6 text-blue-600" />
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900">Edit Field Value</h2>
          <p className="text-sm text-gray-600 mt-1">
            {formattedFieldName} for {bookingInfo.guestName}
          </p>
        </div>

        {/* Booking Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Booking Details</h3>
          <div className="space-y-1 text-sm text-gray-700">
            <div><span className="font-medium">Guest:</span> {bookingInfo.guestName}</div>
            <div><span className="font-medium">Reservation:</span> {bookingInfo.reservationCode}</div>
            <div><span className="font-medium">Check-in:</span> {new Date(bookingInfo.checkInDate).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Value Comparison */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Original Calculated Value
            </label>
            <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
              {formatDisplayValue(originalValue) || ''}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Value calculated from your field mappings
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Value *
            </label>
            <input
              type={isFinancial ? 'number' : 'text'}
              value={newValue}
              onChange={(e) => {
                setNewValue(e.target.value)
                setError(null)
              }}
              step={isFinancial ? '0.01' : undefined}
              min={isFinancial ? '0' : undefined}
              className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={isFinancial ? '0.00' : 'Enter value...'}
              required
            />
            {isFinancial && newValue && !isNaN(parseFloat(newValue)) && (
              <p className="text-xs text-gray-500 mt-1">
                Preview: {formatCurrency(parseFloat(newValue))}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Change (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError(null)
              }}
              rows={3}
              className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Correct amount from property manager, Update based on revised invoice..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Explaining changes helps with audit trails and future reference
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="cursor-pointer px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges}
            className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default EditFieldModal