'use client'

import {
  WifiIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  UserGroupIcon,
  HomeIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline'
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
    <div className="p-4 space-y-4">
      {/* Property Map */}
      {project.propertyAddress && (
        <PropertyMapEmbed
          address={project.propertyAddress}
          googleMapsUrl={project.googleMapsUrl}
          height="h-40"
        />
      )}

      {/* Property Specs */}
      {hasSpecs && (
        <div className="flex items-center gap-3 flex-wrap">
          {project.propertyNumBeds != null && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg">
              <UserGroupIcon className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-700">
                {project.propertyNumBeds} bed{project.propertyNumBeds !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {project.propertyNumBedrooms != null && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 rounded-lg">
              <HomeIcon className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">
                {project.propertyNumBedrooms} bedroom{project.propertyNumBedrooms !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {project.propertyNumBathrooms != null && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-lg">
              <span className="text-sm font-bold text-teal-600">B</span>
              <span className="text-sm font-medium text-teal-700">
                {project.propertyNumBathrooms} bath{project.propertyNumBathrooms !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* WiFi Credentials */}
      {hasWifi && (
        <div className="bg-sky-50 rounded-lg p-3">
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
                <div>
                  <span className="text-xs text-gray-500 block">Password</span>
                  <span className="text-sm font-mono font-medium text-gray-900">{project.propertyWifiPassword}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(project.propertyWifiPassword || '', 'Password')}
                  className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                  title="Copy password"
                >
                  <ClipboardDocumentIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Access Codes */}
      {hasAccessCodes && (
        <div className="bg-orange-50 rounded-lg p-3">
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
          <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono bg-white/80 p-3 rounded-lg">
            {project.propertyAccessCodes}
          </pre>
        </div>
      )}

      {/* Related Bookings */}
      {hasBookings && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarDaysIcon className="w-4 h-4 text-purple-500" />
            <span className="font-medium text-gray-900 text-sm">Related Bookings</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Departing Guest */}
            <div className={`rounded-lg border-l-4 ${project.previousBookingId ? 'border-l-amber-400 bg-amber-50/50' : 'border-l-gray-200 bg-gray-50'} p-3`}>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Departing Guest</p>
              {project.previousBookingId ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">{project.previousBookingGuestName || 'Unknown Guest'}</p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span>{formatDate(project.previousBookingCheckIn)}</span>
                    <ArrowRightIcon className="w-3 h-3" />
                    <span>{formatDate(project.previousBookingCheckOut)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No booking linked</p>
              )}
            </div>

            {/* Arriving Guest */}
            <div className={`rounded-lg border-l-4 ${project.nextBookingId ? 'border-l-blue-400 bg-blue-50/50' : 'border-l-gray-200 bg-gray-50'} p-3`}>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Arriving Guest</p>
              {project.nextBookingId ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">{project.nextBookingGuestName || 'Unknown Guest'}</p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span>{formatDate(project.nextBookingCheckIn)}</span>
                    <ArrowRightIcon className="w-3 h-3" />
                    <span>{formatDate(project.nextBookingCheckOut)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No booking linked</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Time Window */}
      {hasTime && (
        <div className="bg-purple-50 rounded-lg p-3">
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
          <p className="text-sm font-medium text-gray-900 mt-2">
            {formatTime(project.projectStartTime)}
            {project.projectStartTime && project.projectEndTime && ' - '}
            {formatTime(project.projectEndTime)}
          </p>
        </div>
      )}

      {/* PM Notes */}
      {project.pmNotes && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <ChatBubbleLeftIcon className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Manager Notes</span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.pmNotes}</p>
        </div>
      )}
    </div>
  )
}
