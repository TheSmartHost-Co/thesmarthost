'use client'

import React from 'react'
import { PropertyChannel } from '@/services/types/propertyChannel'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAirbnb, faGoogle } from '@fortawesome/free-brands-svg-icons'
import { HomeIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

interface ChannelIconRowProps {
  channels: PropertyChannel[]
  maxVisible?: number
}

/**
 * Get icon component for channel type
 */
const getChannelIcon = (channelName: string): React.ReactNode => {
  const name = channelName.toLowerCase()

  switch (name) {
    case 'airbnb':
      return <FontAwesomeIcon icon={faAirbnb} className="w-5 h-5" color="red" />
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
 * Channel icon row component for property table display
 * Shows active channels as clickable icons (max 3-4) with "+X more" badge
 */
const ChannelIconRow: React.FC<ChannelIconRowProps> = ({
  channels,
  maxVisible = 4,
}) => {
  // Filter to only active channels
  const activeChannels = channels.filter((channel) => channel.isActive)

  if (activeChannels.length === 0) {
    return <span className="text-sm text-gray-400">No channels</span>
  }

  const visibleChannels = activeChannels.slice(0, maxVisible)
  const remainingCount = activeChannels.length - maxVisible

  return (
    <div className="flex items-center gap-2">
      {visibleChannels.map((channel) => (
        <button
          key={channel.id}
          onClick={(e) => {
            e.stopPropagation() // Prevent row click event
            window.open(channel.publicUrl, '_blank', 'noopener,noreferrer')
          }}
          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          title={`${getChannelDisplayName(channel.channelName)} - Click to open`}
          aria-label={`Open ${getChannelDisplayName(channel.channelName)}`}
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
