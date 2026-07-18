'use client'

import { useTranslation } from 'react-i18next'
import {
  HomeModernIcon,
  HomeIcon,
  UserGroupIcon,
  WifiIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import type { PropertyCardProps } from '../types'

/** Property name/address, room counts, WiFi + access codes (with copy), maps link. */
export default function PropertyCard({ project }: PropertyCardProps) {
  const { t } = useTranslation('turnover')
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <HomeModernIcon className="w-4.5 h-4.5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('property')}</p>
          <p className="font-semibold text-gray-900 mt-0.5">{project.propertyName || t('unknownProperty')}</p>
          {project.propertyAddress && (
            <p className="text-sm text-gray-500 mt-0.5">{project.propertyAddress}</p>
          )}
        </div>
      </div>

      {/* Beds / Bedrooms / Bathrooms — inline pills */}
      {(project.propertyNumBeds || project.propertyNumBedrooms || project.propertyNumBathrooms) && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-600">
          {project.propertyNumBedrooms !== null && project.propertyNumBedrooms !== undefined && (
            <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
              <HomeIcon className="w-3 h-3 text-violet-500" />
              {project.propertyNumBedrooms}BR
            </span>
          )}
          {project.propertyNumBathrooms !== null && project.propertyNumBathrooms !== undefined && (
            <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
              <span className="text-xs font-bold text-teal-500">B</span>
              {project.propertyNumBathrooms}BA
            </span>
          )}
          {project.propertyNumBeds !== null && project.propertyNumBeds !== undefined && (
            <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
              <UserGroupIcon className="w-3 h-3 text-indigo-500" />
              {project.propertyNumBeds} bed{project.propertyNumBeds !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* WiFi Credentials */}
      {(project.propertyWifiSsid || project.propertyWifiPassword) && (
        <div className="flex items-start gap-2">
          <WifiIcon className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
          <div className="flex items-center gap-3 flex-wrap">
            {project.propertyWifiSsid && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">{t('networkLabel')}:</span>
                <span className="text-xs font-medium text-gray-900 font-mono">{project.propertyWifiSsid}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(project.propertyWifiSsid || '')}
                  className="p-0.5 text-gray-400 hover:text-gray-600 rounded cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  title={t('copyNetworkName')}
                >
                  <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {project.propertyWifiPassword && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">{t('passLabel')}:</span>
                <span className="text-xs font-medium text-gray-900 font-mono">{project.propertyWifiPassword}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(project.propertyWifiPassword || '')}
                  className="p-0.5 text-gray-400 hover:text-gray-600 rounded cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  title={t('copyPassword')}
                >
                  <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Access Codes */}
      {project.propertyAccessCodes && (
        <div className="flex items-start gap-2">
          <KeyIcon className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">{t('accessCodesLabel')}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(project.propertyAccessCodes || '')}
                className="inline-flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600 cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                title={t('copyAllCodes')}
              >
                <ClipboardDocumentIcon className="w-3 h-3" />
                {t('copyButton')}
              </button>
            </div>
            <pre className="text-xs text-gray-900 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded-lg">
              {project.propertyAccessCodes}
            </pre>
          </div>
        </div>
      )}

      {/* Google Maps link */}
      {project.propertyAddress && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.propertyAddress)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
        >
          <ArrowRightIcon className="w-3 h-3" />
          {t('viewOnGoogleMaps')}
        </a>
      )}
    </div>
  )
}
