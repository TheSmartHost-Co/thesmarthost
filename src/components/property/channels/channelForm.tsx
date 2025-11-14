'use client'

import React, { useState, useEffect } from 'react'
import { PropertyChannel, LocalPropertyChannel, CHANNEL_OPTIONS } from '@/services/types/propertyChannel'
import { validateChannelUrl } from '@/services/propertyChannelService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getChannelIcon, getChannelDisplayName } from '@/services/channelUtils'

interface ChannelFormProps {
  propertyId: string
  existingChannel?: PropertyChannel | LocalPropertyChannel | null // For edit mode
  onSave: (channelData: {
    channelName: string
    publicUrl: string
    isActive: boolean
  }) => void
  onCancel: () => void
}

/**
 * Inline form for adding/editing property channels
 * Expands below channel list in update modal
 */
const ChannelForm: React.FC<ChannelFormProps> = ({
  propertyId,
  existingChannel,
  onSave,
  onCancel,
}) => {
  const showNotification = useNotificationStore((state) => state.showNotification)

  const [channelName, setChannelName] = useState('')
  const [customChannelName, setCustomChannelName] = useState('')
  const [publicUrl, setPublicUrl] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Populate form if editing
  useEffect(() => {
    if (existingChannel) {
      // Check if it's a predefined channel or custom
      const isPredefined = CHANNEL_OPTIONS.slice(0, -1).includes(
        existingChannel.channelName as any
      )
      if (isPredefined) {
        setChannelName(existingChannel.channelName)
      } else {
        setChannelName('custom')
        setCustomChannelName(existingChannel.channelName)
      }
      setPublicUrl(existingChannel.publicUrl)
      setIsActive(existingChannel.isActive)
    }
  }, [existingChannel])

  const handleSubmit = () => {
    // Get final channel name (predefined or custom)
    const finalChannelName = channelName === 'custom' ? customChannelName : channelName

    // Validation
    if (!finalChannelName.trim()) {
      showNotification('Please select or enter a channel name', 'error')
      return
    }

    if (!publicUrl.trim()) {
      showNotification('Please enter a public URL', 'error')
      return
    }

    // URL format validation
    try {
      new URL(publicUrl)
    } catch {
      showNotification('Please enter a valid URL (e.g., https://example.com)', 'error')
      return
    }

    // Call parent save handler
    onSave({
      channelName: finalChannelName,
      publicUrl,
      isActive,
    })
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          {existingChannel ? 'Edit Channel' : 'Add Channel'}
        </h4>
      </div>

      {/* Channel Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Channel <span className="text-red-500">*</span>
        </label>
        <select
          value={channelName}
          onChange={(e) => setChannelName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a channel</option>
          {CHANNEL_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {getChannelDisplayName(option)}
            </option>
          ))}
        </select>
      </div>

      {/* Custom Channel Name Input (shown when "Custom" selected) */}
      {channelName === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Channel Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={customChannelName}
            onChange={(e) => setCustomChannelName(e.target.value)}
            placeholder="e.g., HomeAway, TripAdvisor"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Public URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Public URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={publicUrl}
          onChange={(e) => setPublicUrl(e.target.value)}
          placeholder="https://example.com/listing/12345"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {channelName && channelName !== 'custom' && (
          <p className="text-xs text-gray-500 mt-1">
            Must be a {getChannelDisplayName(channelName)} URL
          </p>
        )}
      </div>

      {/* Active Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="channel-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
        <label htmlFor="channel-active" className="text-sm font-medium text-gray-700">
          Enabled
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {existingChannel ? 'Save Changes' : 'Add Channel'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default ChannelForm
