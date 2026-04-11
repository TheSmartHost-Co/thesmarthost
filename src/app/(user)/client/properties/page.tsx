'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  HomeModernIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'
import { getClientPortalProperties } from '@/services/clientPortalService'
import { getChannelIcon } from '@/services/channelUtils'
import type { ClientPortalProperty } from '@/services/types/clientPortal'
import PreviewClientPropertyModal from '@/components/client-portal/property/PreviewClientPropertyModal'

export default function ClientPropertiesPage() {
  const { t } = useTranslation('clientPortal')
  const [properties, setProperties] = useState<ClientPortalProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedProperty, setSelectedProperty] = useState<ClientPortalProperty | null>(null)

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
          <h1 className="text-2xl font-bold text-gray-900">{t('myPropertiesTitle')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {properties.length} propert{properties.length === 1 ? 'y' : 'ies'} in your portfolio
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchByNameOrAddress')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Property Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-2xl bg-gray-50 p-4 mb-4">
            <BuildingOffice2Icon className="h-8 w-8 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">{t('noPropertiesFound')}</p>
          {search && (
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search term</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p, i) => {
            const isInactive = !p.isActive

            // Build bed/bath summary
            const infoParts: string[] = []
            if (p.numBedrooms != null)
              infoParts.push(`${p.numBedrooms} bed${p.numBedrooms !== 1 ? 'rooms' : 'room'}`)
            if (p.numBeds != null)
              infoParts.push(`${p.numBeds} bed${p.numBeds !== 1 ? 's' : ''}`)
            if (p.numBathrooms != null)
              infoParts.push(`${p.numBathrooms} bath${p.numBathrooms !== 1 ? 's' : ''}`)

            // Commission display
            const commissionRate = p.commissionRateOverride ?? p.commissionRate

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedProperty(p)}
                className={`rounded-xl bg-white shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${
                  isInactive ? 'opacity-60 border-gray-200' : 'border-gray-100'
                }`}
              >
                <div className="p-5 space-y-3">
                  {/* Top: Icon + Name + Address */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="rounded-lg bg-emerald-50 p-2.5 shrink-0">
                      <HomeModernIcon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {p.listingName}
                      </p>
                      {p.address && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{p.address}</p>
                      )}
                    </div>
                  </div>

                  {/* Badges: Type + Status */}
                  <div className="flex items-center gap-2">
                    {p.propertyType && (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        {p.propertyType}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          p.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Bed/Bath Info */}
                  {infoParts.length > 0 && (
                    <p className="text-xs text-gray-500">{infoParts.join(' \u00B7 ')}</p>
                  )}

                  {/* Channel Icons Row */}
                  {p.channels && p.channels.length > 0 && (
                    <div className="flex items-center gap-2">
                      {p.channels.map((ch) => (
                        <span
                          key={ch.id}
                          title={ch.channelName}
                          className={`w-6 h-6 flex items-center justify-center rounded-full [&>svg]:w-3.5 [&>svg]:h-3.5 ${
                            ch.isActive
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {getChannelIcon(ch.channelName)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Commission Rate */}
                  {commissionRate != null && (
                    <p className="text-xs text-gray-500">
                      {commissionRate}% commission
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      {selectedProperty && (
        <PreviewClientPropertyModal
          isOpen={!!selectedProperty}
          onClose={() => setSelectedProperty(null)}
          property={selectedProperty}
        />
      )}
    </div>
  )
}
