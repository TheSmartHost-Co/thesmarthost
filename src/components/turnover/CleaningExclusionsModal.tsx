'use client'

import { useState } from 'react'
import Modal from '../shared/modal'
import { MagnifyingGlassIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import type { Property } from '@/services/types/property'

interface CleaningExclusionsModalProps {
  isOpen: boolean
  onClose: () => void
  properties: Property[]
  onToggleCleaningManaged: (propertyId: string, enabled: boolean) => void
}

const getPropertyName = (p: Property) =>
  p.listingName || p.internalName || p.externalName || p.address || 'Unnamed Property'

export default function CleaningExclusionsModal({
  isOpen,
  onClose,
  properties,
  onToggleCleaningManaged,
}: CleaningExclusionsModalProps) {
  const [search, setSearch] = useState('')

  const sorted = properties
    .slice()
    .sort((a, b) => getPropertyName(a).localeCompare(getPropertyName(b)))

  const filtered = sorted.filter(p => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      getPropertyName(p).toLowerCase().includes(term) ||
      p.address?.toLowerCase().includes(term)
    )
  })

  const excludedCount = properties.filter(p => p.cleaningManaged === false).length

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-lg w-11/12 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-gray-800 to-gray-900">
        <div className="flex items-center gap-4">
          <div className="shrink-0 h-11 w-11 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <NoSymbolIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Cleaning Exclusions</h2>
            <p className="text-white/60 text-sm">
              {excludedCount === 0
                ? 'All properties are cleaning-managed'
                : `${excludedCount} of ${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} excluded`}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Search */}
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search properties..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
          />
        </div>

        {/* Property list */}
        <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No properties found
            </div>
          ) : (
            filtered.map(p => {
              const enabled = p.cleaningManaged !== false
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-4 py-3 transition-colors ${
                    !enabled ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="min-w-0 mr-3">
                    <p className={`text-sm font-medium truncate ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                      {getPropertyName(p)}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{p.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleCleaningManaged(p.id, !enabled)}
                    className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 cursor-pointer ${
                      enabled ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <p className="text-xs text-gray-400 text-center mt-3">
          Excluded properties won&apos;t appear on the calendar or receive cleaning projects
        </p>
      </div>
    </Modal>
  )
}
