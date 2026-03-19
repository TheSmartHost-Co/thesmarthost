'use client'

import { useState } from 'react'
import {
  WifiIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  HomeIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { LuBath } from 'react-icons/lu'
import { IoBedOutline } from 'react-icons/io5'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { CleaningProject } from '@/services/types/cleaningProject'
import { formatTime } from '@/services/cleaningProjectService'
import PropertyMapEmbed from '@/components/shared/PropertyMapEmbed'

interface InfoContentProps {
  project: CleaningProject
  onRequestTimeChange?: () => void
}

export default function InfoContent({ project, onRequestTimeChange }: InfoContentProps) {
  const showNotification = useNotificationStore((state) => state.showNotification)
  const [showPassword, setShowPassword] = useState(false)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showNotification(`${label} copied to clipboard`, 'success')
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const hasSpecs = project.propertyNumBeds || project.propertyNumBedrooms || project.propertyNumBathrooms
  const hasWifi = project.propertyWifiSsid || project.propertyWifiPassword
  const hasAccessCodes = project.propertyAccessCodes
  const hasBookings = project.previousBookingId || project.nextBookingId
  const hasTime = project.projectStartTime || project.projectEndTime

  return (
    <div className="p-4 space-y-3">
      {/* Map */}
      {project.propertyAddress && (
        <PropertyMapEmbed
          address={project.propertyAddress}
          googleMapsUrl={project.googleMapsUrl}
          height="h-40"
        />
      )}

      {/* Related Bookings */}
      {hasBookings && (
        <div className="border-l-4 border-indigo-500 bg-indigo-50/40 rounded-r-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDaysIcon className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Related Bookings</span>
          </div>
          <div className="rounded-lg border border-indigo-100 bg-white/80 divide-y divide-gray-100">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider w-20 flex-shrink-0">Departing</span>
              {project.previousBookingId ? (
                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  <span className="font-medium text-gray-900 truncate">{project.previousBookingGuestName || 'Unknown'}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDate(project.previousBookingCheckIn)}
                    <ArrowRightIcon className="w-2.5 h-2.5 inline mx-1" />
                    {formatDate(project.previousBookingCheckOut)}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">No booking linked</span>
              )}
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider w-20 flex-shrink-0">Arriving</span>
              {project.nextBookingId ? (
                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  <span className="font-medium text-gray-900 truncate">{project.nextBookingGuestName || 'Unknown'}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDate(project.nextBookingCheckIn)}
                    <ArrowRightIcon className="w-2.5 h-2.5 inline mx-1" />
                    {formatDate(project.nextBookingCheckOut)}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">No booking linked</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Time Window */}
      {hasTime && (
        <div className="border-l-4 border-purple-500 bg-purple-50/40 rounded-r-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Time Window</span>
            </div>
            {onRequestTimeChange && project.status !== 'completed' && (
              <button
                onClick={onRequestTimeChange}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowPathIcon className="w-3 h-3" />
                Request Change
              </button>
            )}
          </div>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {formatTime(project.projectStartTime)}
            {project.projectStartTime && project.projectEndTime && ' - '}
            {formatTime(project.projectEndTime)}
          </p>
        </div>
      )}

      {/* Access Codes */}
      {hasAccessCodes && (
        <div className="border-l-4 border-orange-500 bg-orange-50/40 rounded-r-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <KeyIcon className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Access Codes</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(project.propertyAccessCodes || '', 'Access codes')}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
              title="Copy all codes"
            >
              <ClipboardDocumentIcon className="w-3.5 h-3.5" />
              Copy All
            </button>
          </div>
          <pre className="text-sm text-gray-900 whitespace-pre-wrap break-all overflow-x-auto max-w-full font-mono bg-white/80 p-3 rounded-lg">
            {project.propertyAccessCodes}
          </pre>
        </div>
      )}

      {/* WiFi */}
      {hasWifi && (
        <div className="border-l-4 border-sky-500 bg-sky-50/40 rounded-r-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <WifiIcon className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">WiFi</span>
          </div>
          <div className="space-y-2">
            {project.propertyWifiSsid && (
              <div className="flex items-center justify-between bg-white/80 rounded-lg px-3 py-2">
                <div>
                  <span className="text-xs text-gray-500 block">Network</span>
                  <span className="text-sm font-mono font-medium text-gray-900">{project.propertyWifiSsid}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(project.propertyWifiSsid || '', 'Network name')}
                  className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                  title="Copy network name"
                >
                  <ClipboardDocumentIcon className="w-5 h-5" />
                </button>
              </div>
            )}
            {project.propertyWifiPassword && (
              <div className="flex items-center justify-between bg-white/80 rounded-lg px-3 py-2">
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-gray-500 block">Password</span>
                  <span className="text-sm font-mono font-medium text-gray-900">
                    {showPassword ? project.propertyWifiPassword : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(project.propertyWifiPassword || '', 'Password')}
                    className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy password"
                  >
                    <ClipboardDocumentIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PM Notes */}
      {project.pmNotes && (
        <div className="border-l-4 border-gray-400 bg-gray-50/40 rounded-r-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <ChatBubbleLeftIcon className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Manager Notes</span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.pmNotes}</p>
        </div>
      )}

      {/* Property Specs */}
      {hasSpecs && (
        <div className="border-l-4 border-stone-400 bg-stone-50/40 rounded-r-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <HomeIcon className="w-4 h-4 text-stone-500" />
            <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Property Details</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {project.propertyNumBeds != null && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-lg">
                <IoBedOutline className="w-4 h-4 text-stone-600" />
                <span className="text-sm font-medium text-gray-700">
                  {project.propertyNumBeds} bed{project.propertyNumBeds !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {project.propertyNumBedrooms != null && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-lg">
                <HomeIcon className="w-4 h-4 text-stone-600" />
                <span className="text-sm font-medium text-gray-700">
                  {project.propertyNumBedrooms} bedroom{project.propertyNumBedrooms !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {project.propertyNumBathrooms != null && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-lg">
                <LuBath className="w-4 h-4 text-stone-600" />
                <span className="text-sm font-medium text-gray-700">
                  {project.propertyNumBathrooms} bath{project.propertyNumBathrooms !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
