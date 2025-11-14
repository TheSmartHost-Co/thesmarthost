'use client'

import React, { useState } from 'react'
import { PropertyChannel, LocalPropertyChannel } from '@/services/types/propertyChannel'
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAirbnb, faGoogle } from '@fortawesome/free-brands-svg-icons'
import { HomeIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import ChannelForm from './channelForm'

interface ChannelListProps {
  propertyId?: string // Optional for local mode (create property flow)
  channels: PropertyChannel[] | LocalPropertyChannel[]
  onAddChannel: (channelData: {
    channelName: string
    publicUrl: string
    isActive: boolean
  }) => void
  onEditChannel: (
    channelId: string,
    channelData: { channelName: string; publicUrl: string; isActive: boolean }
  ) => void
  onDeleteChannel: (channelId: string) => void
}

/**
 * Get icon for channel type
 */
const getChannelIcon = (channelName: string): React.ReactNode => {
  const name = channelName.toLowerCase()

  switch (name) {
    case 'airbnb':
      return <FontAwesomeIcon icon={faAirbnb} className="w-5 h-5" color="red"/>
    case 'vrbo':
      return <GlobeAltIcon className="w-5 h-5" />
    case 'booking_com':
      return <GlobeAltIcon className="w-5 h-5" />
    case 'google':
      return <FontAwesomeIcon icon={faGoogle} className="w-5 h-5" />
    case 'direct':
      return <HomeIcon className="w-5 h-5" />
    case 'expedia':
      return <GlobeAltIcon className="w-5 h-5" />
    default:
      return <GlobeAltIcon className="w-5 h-5" />
  }
}

/**
 * Get display name for channel
 */
const getChannelDisplayName = (channelName: string): string => {
  const name = channelName.toLowerCase()
  const displayNames: Record<string, string> = {
    airbnb: 'Airbnb',
    vrbo: 'VRBO',
    booking_com: 'Booking.com',
    google: 'Google',
    direct: 'Direct',
    expedia: 'Expedia',
  }
  return displayNames[name] || channelName
}

/**
 * Helper to get channel ID (works with both PropertyChannel and LocalPropertyChannel)
 */
const getChannelId = (channel: PropertyChannel | LocalPropertyChannel): string => {
  return 'id' in channel ? channel.id : channel.tempId
}

/**
 * Channel list component for managing property channels
 * Shows list with edit/delete actions and inline add/edit form
 */
const ChannelList: React.FC<ChannelListProps> = ({
  propertyId,
  channels,
  onAddChannel,
  onEditChannel,
  onDeleteChannel,
}) => {
  const [isAdding, setIsAdding] = useState(false)
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null)

  const handleSaveNew = (channelData: {
    channelName: string
    publicUrl: string
    isActive: boolean
  }) => {
    onAddChannel(channelData)
    setIsAdding(false)
  }

  const handleSaveEdit = (channelData: {
    channelName: string
    publicUrl: string
    isActive: boolean
  }) => {
    if (editingChannelId) {
      onEditChannel(editingChannelId, channelData)
      setEditingChannelId(null)
    }
  }

  const editingChannel = channels.find((c) => getChannelId(c) === editingChannelId)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Channels ({channels.length})
        </h3>
        {!isAdding && !editingChannelId && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Channel
          </button>
        )}
      </div>

      {/* Channel List */}
      {!editingChannelId && channels.length > 0 && (
        <div className="space-y-2">
          {channels.map((channel) => {
            const channelId = getChannelId(channel)
            return (
              <div
                key={channelId}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  channel.isActive
                    ? 'border-gray-200 bg-white'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={channel.isActive ? 'text-blue-600' : 'text-gray-400'}>
                    {getChannelIcon(channel.channelName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {getChannelDisplayName(channel.channelName)}
                      </p>
                      {!channel.isActive && (
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
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
                    onClick={() => setEditingChannelId(channelId)}
                    className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit channel"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteChannel(channelId)}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete channel"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!isAdding && !editingChannelId && channels.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
          No channels added yet. Click "Add Channel" to get started.
        </div>
      )}

      {/* Add Channel Form */}
      {isAdding && (
        <ChannelForm
          propertyId={propertyId || ''}
          onSave={handleSaveNew}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {/* Edit Channel Form */}
      {editingChannelId && editingChannel && (
        <ChannelForm
          propertyId={propertyId || ''}
          existingChannel={editingChannel}
          onSave={handleSaveEdit}
          onCancel={() => setEditingChannelId(null)}
        />
      )}
    </div>
  )
}

export default ChannelList
