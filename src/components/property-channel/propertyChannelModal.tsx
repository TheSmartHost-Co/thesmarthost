'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../shared/modal'
import {
  getChannelsByPropertyId,
  createPropertyChannel,
  updatePropertyChannel,
  deletePropertyChannel
} from '@/services/propertyChannelService'
import type { PropertyChannel } from '@/services/types/propertyChannel'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getChannelIcon, getChannelDisplayName } from '@/services/channelUtils'
import ChannelForm from '../property/channels/channelForm'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  SignalIcon
} from '@heroicons/react/24/outline'

interface PropertyChannelModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: string
  propertyName: string
  initialChannels?: PropertyChannel[]
  onRefreshProperties?: () => Promise<void>
}

const PropertyChannelModal: React.FC<PropertyChannelModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  initialChannels,
  onRefreshProperties,
}) => {
  const [channels, setChannels] = useState<PropertyChannel[]>([])
  const [loading, setLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null)

  const showNotification = useNotificationStore((state) => state.showNotification)

  // Initialize with stored data when modal opens
  useEffect(() => {
    if (isOpen) {
      setChannels(initialChannels || [])
      setIsAdding(false)
      setEditingChannelId(null)
    }
  }, [isOpen, initialChannels])

  // Helper to refresh channels and update parent
  const refreshAndUpdateParent = async () => {
    try {
      const response = await getChannelsByPropertyId(propertyId)
      if (response.status === 'success') {
        setChannels(response.data)
      }
      // Refresh all properties in parent
      await onRefreshProperties?.()
    } catch (error) {
      console.error('Error refreshing channels:', error)
    }
  }

  const handleAddChannel = async (channelData: {
    channelName: string
    publicUrl: string
    isActive: boolean
  }) => {
    try {
      const response = await createPropertyChannel({
        propertyId,
        ...channelData
      })

      if (response.status === 'success') {
        showNotification('Channel added successfully', 'success')
        await refreshAndUpdateParent()
        setIsAdding(false)
      } else {
        showNotification(response.message || 'Failed to add channel', 'error')
      }
    } catch (error) {
      console.error('Error adding channel:', error)
      showNotification('Error adding channel', 'error')
    }
  }

  const handleEditChannel = async (
    channelId: string,
    channelData: { channelName: string; publicUrl: string; isActive: boolean }
  ) => {
    try {
      const response = await updatePropertyChannel(channelId, channelData)

      if (response.status === 'success') {
        showNotification('Channel updated successfully', 'success')
        await refreshAndUpdateParent()
        setEditingChannelId(null)
      } else {
        showNotification(response.message || 'Failed to update channel', 'error')
      }
    } catch (error) {
      console.error('Error updating channel:', error)
      showNotification('Error updating channel', 'error')
    }
  }

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) {
      return
    }

    try {
      const response = await deletePropertyChannel(channelId)

      if (response.status === 'success') {
        showNotification('Channel deleted successfully', 'success')
        await refreshAndUpdateParent()
      } else {
        showNotification(response.message || 'Failed to delete channel', 'error')
      }
    } catch (error) {
      console.error('Error deleting channel:', error)
      showNotification('Error deleting channel', 'error')
    }
  }

  const editingChannel = channels.find((c) => c.id === editingChannelId)

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-2xl w-11/12">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{propertyName}</h2>
        <p className="text-sm text-gray-500">Manage distribution channels for this property</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading channels...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Channels ({channels.length})
            </h3>
            {!isAdding && !editingChannelId && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Channel
              </button>
            )}
          </div>

          {/* Channel List */}
          {!editingChannelId && channels.length > 0 && (
            <div className="space-y-2">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${
                    channel.isActive
                      ? 'border-gray-200 bg-white hover:border-gray-300'
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      channel.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {getChannelIcon(channel.channelName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {getChannelDisplayName(channel.channelName)}
                        </p>
                        {!channel.isActive && (
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{channel.publicUrl}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3">
                    <button
                      type="button"
                      onClick={() => setEditingChannelId(channel.id)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit channel"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteChannel(channel.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete channel"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isAdding && !editingChannelId && channels.length === 0 && (
            <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl">
              <SignalIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No channels added yet</p>
              <p className="text-gray-400 text-sm mb-4">Add distribution channels like Airbnb, VRBO, etc.</p>
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Your First Channel
              </button>
            </div>
          )}

          {/* Add Channel Form */}
          {isAdding && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Channel</h4>
              <ChannelForm
                propertyId={propertyId}
                onSave={handleAddChannel}
                onCancel={() => setIsAdding(false)}
              />
            </div>
          )}

          {/* Edit Channel Form */}
          {editingChannelId && editingChannel && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Edit Channel</h4>
              <ChannelForm
                propertyId={propertyId}
                existingChannel={editingChannel}
                onSave={(data) => handleEditChannel(editingChannelId, data)}
                onCancel={() => setEditingChannelId(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal Footer */}
      <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default PropertyChannelModal
