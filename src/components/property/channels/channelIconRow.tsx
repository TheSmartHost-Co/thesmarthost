'use client'

import React from 'react'
import { PropertyChannel } from '@/services/types/propertyChannel'
import { getChannelIcon, getChannelDisplayName } from '@/services/channelUtils'

interface ChannelIconRowProps {
  channels: PropertyChannel[]
  maxVisible?: number
}

/**
 * Channel icon row component for property table display
 * Shows active channels as clickable icons (max 3-4) with "+X more" badge
 */
const ChannelIconRow: React.FC<ChannelIconRowProps> = ({
  channels,
  maxVisible = 7,
}) => {
  // Filter to only active channels
  const activeChannels = channels.filter((channel) => channel.isActive)

  if (activeChannels.length === 0) {
    return <span className="text-sm text-gray-400">No channels</span>
  }

  const visibleChannels = activeChannels.slice(0, maxVisible)
  const remainingCount = activeChannels.length - maxVisible

  return (
    <div className="flex items-center">
      {visibleChannels.map((channel, index) => (
        <button
          key={channel.id}
          onClick={(e) => {
            e.stopPropagation() // Prevent row click event
            window.open(channel.publicUrl, '_blank', 'noopener,noreferrer')
          }}
          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          title={`${getChannelDisplayName(channel.channelName)} - Click to open`}
          aria-label={`Open ${getChannelDisplayName(channel.channelName)}`}
          style={{
            marginLeft: index === 0 ? 0 : -10, // Overlap icons
          }}
        >
          {getChannelIcon(channel.channelName)}
        </button>
      ))}

      {remainingCount > 0 && (
        <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded">
          +{remainingCount} more
        </span>
      )}
    </div>
  )
}

export default ChannelIconRow
