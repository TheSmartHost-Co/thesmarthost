'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HomeModernIcon,
  MapPinIcon,
  WifiIcon,
  KeyIcon,
  ClockIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'
import { getClientPortalProperties } from '@/services/clientPortalService'
import type { ClientPortalProperty } from '@/services/types/clientPortal'

export default function ClientPropertiesPage() {
  const [properties, setProperties] = useState<ClientPortalProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await getClientPortalProperties()
        if (res.status === 'success') {
          setProperties(res.data)
        }
      } catch (err) {
        console.error('Failed to load properties:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = properties.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.listingName.toLowerCase().includes(q) ||
      (p.address?.toLowerCase().includes(q) ?? false)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">{properties.length} properties in your portfolio</p>
        </div>
        <div className="relative w-full sm:w-72">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Property Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No properties found</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((p, i) => {
            const isExpanded = expandedId === p.id
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Summary Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="rounded-lg bg-emerald-50 p-2.5 shrink-0">
                      <HomeModernIcon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.listingName}</p>
                      {p.address && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{p.address}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {p.propertyType && (
                      <span className="hidden sm:inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        {p.propertyType}
                      </span>
                    )}
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {isExpanded ? (
                      <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Property Info */}
                          <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</h3>
                            {p.address && (
                              <div className="flex items-start gap-2 text-sm">
                                <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                <span className="text-gray-700">
                                  {p.address}
                                  {p.postalCode ? `, ${p.postalCode}` : ''}
                                  {p.province ? `, ${p.province}` : ''}
                                </span>
                              </div>
                            )}
                            {p.propertyType && (
                              <div className="flex items-center gap-2 text-sm">
                                <HomeModernIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className="text-gray-700">{p.propertyType}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              {p.numBedrooms != null && <span>{p.numBedrooms} bed{p.numBedrooms !== 1 ? 'rooms' : 'room'}</span>}
                              {p.numBeds != null && <span>{p.numBeds} bed{p.numBeds !== 1 ? 's' : ''}</span>}
                              {p.numBathrooms != null && <span>{p.numBathrooms} bath{p.numBathrooms !== 1 ? 's' : ''}</span>}
                            </div>
                          </div>

                          {/* Access Info */}
                          <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Access</h3>
                            {p.wifiSsid && (
                              <div className="flex items-center gap-2 text-sm">
                                <WifiIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className="text-gray-700">{p.wifiSsid}{p.wifiPassword ? ` / ${p.wifiPassword}` : ''}</span>
                              </div>
                            )}
                            {p.accessCodes && (
                              <div className="flex items-center gap-2 text-sm">
                                <KeyIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className="text-gray-700">{p.accessCodes}</span>
                              </div>
                            )}
                            {(p.defaultCheckinTime || p.defaultCheckoutTime) && (
                              <div className="flex items-center gap-2 text-sm">
                                <ClockIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className="text-gray-700">
                                  {p.defaultCheckinTime ? `Check-in: ${p.defaultCheckinTime}` : ''}
                                  {p.defaultCheckinTime && p.defaultCheckoutTime ? ' · ' : ''}
                                  {p.defaultCheckoutTime ? `Check-out: ${p.defaultCheckoutTime}` : ''}
                                </span>
                              </div>
                            )}
                            {!p.wifiSsid && !p.accessCodes && !p.defaultCheckinTime && !p.defaultCheckoutTime && (
                              <p className="text-sm text-gray-400">No access info available</p>
                            )}
                          </div>

                          {/* Channels */}
                          <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Channels</h3>
                            {p.channels && p.channels.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {p.channels.map((ch) => (
                                  <span
                                    key={ch.id}
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${ch.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                                  >
                                    <GlobeAltIcon className="h-3 w-3" />
                                    {ch.channelName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400">No channels configured</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
