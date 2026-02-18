'use client'

import { useState } from 'react'
import { MapPinIcon, ArrowTopRightOnSquareIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface PropertyMapEmbedProps {
  address: string
  googleMapsUrl?: string | null
  height?: string // Tailwind height class, e.g., "h-56", "h-64"
  className?: string
  collapsible?: boolean // If true, shows compact address row with toggle (default: false)
  defaultExpanded?: boolean // Initial state when collapsible (default: false)
}

export default function PropertyMapEmbed({
  address,
  googleMapsUrl,
  height = 'h-56',
  className = '',
  collapsible = false,
  defaultExpanded = false,
}: PropertyMapEmbedProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const encodedAddress = encodeURIComponent(address)

  // Build Google Maps URL for opening in new tab
  const mapsLinkUrl = googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`

  // Build embed URL using Maps Embed API
  const embedUrl = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}`
    : null

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const openInMaps = () => {
    window.open(mapsLinkUrl, '_blank', 'noopener,noreferrer')
  }

  // Collapsible mode - show compact address row with toggle
  if (collapsible) {
    return (
      <div className={`bg-gray-50 rounded-xl overflow-hidden ${className}`}>
        {/* Collapsed state - address row with buttons */}
        <div className="p-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPinIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 line-clamp-2">{address}</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUpIcon className="w-3.5 h-3.5" />
                      Hide Map
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="w-3.5 h-3.5" />
                      Show Map
                    </>
                  )}
                </button>
                <button
                  onClick={openInMaps}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                  Navigate
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded state - show map embed */}
        {isExpanded && (
          <div className="border-t border-gray-200">
            {(!embedUrl || hasError) ? (
              // Fallback when no API key
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500 mb-2">Map preview requires API key</p>
                <button
                  onClick={openInMaps}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  Open in Google Maps
                </button>
              </div>
            ) : (
              <div className={`relative ${height}`}>
                {/* Loading skeleton */}
                {isLoading && (
                  <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <MapPinIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                )}

                {/* Google Maps iframe */}
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  className={isLoading ? 'opacity-0' : 'opacity-100'}
                  title={`Map showing ${address}`}
                />

                {/* Open in Maps button */}
                <button
                  onClick={openInMaps}
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm text-xs font-medium text-gray-700 rounded-lg shadow-md hover:bg-white hover:shadow-lg transition-all cursor-pointer"
                  title="Open in Google Maps"
                >
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                  Open in Maps
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Non-collapsible mode (original behavior)
  // Fallback view when no API key or error
  if (!embedUrl || hasError) {
    return (
      <button
        onClick={openInMaps}
        className={`w-full ${height} bg-gray-100 rounded-xl flex flex-col items-center justify-center gap-3 hover:bg-gray-200 transition-colors cursor-pointer group ${className}`}
      >
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
          <MapPinIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div className="text-center px-4">
          <p className="text-sm font-medium text-gray-900 mb-1">View on Google Maps</p>
          <p className="text-xs text-gray-500 line-clamp-2">{address}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
          Open Map <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
        </span>
      </button>
    )
  }

  return (
    <div className={`relative ${height} rounded-xl overflow-hidden ${className}`}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <MapPinIcon className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      )}

      {/* Google Maps iframe */}
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        className={isLoading ? 'opacity-0' : 'opacity-100'}
        title={`Map showing ${address}`}
      />

      {/* Click overlay to open full Google Maps */}
      <button
        onClick={openInMaps}
        className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm text-xs font-medium text-gray-700 rounded-lg shadow-md hover:bg-white hover:shadow-lg transition-all cursor-pointer"
        title="Open in Google Maps"
      >
        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
        Open in Maps
      </button>
    </div>
  )
}
