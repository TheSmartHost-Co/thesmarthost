'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarDaysIcon, BuildingOfficeIcon, CloudIcon, ServerStackIcon } from '@heroicons/react/24/outline'
import type { Property } from '@/services/types/property'
import type { SyncDateField, SyncSource } from '@/services/types/cleaningProject'

const MAX_RANGE_DAYS = 90

export interface ConfigureFormState {
  startDate: string
  endDate: string
  dateField: SyncDateField
  propertyIds: string[]
  sources: SyncSource[]
}

interface ConfigureStepProps {
  config: ConfigureFormState
  properties: Property[]
  onChange: (next: ConfigureFormState) => void
  onNext: () => void
  onCancel: () => void
}

const daysBetween = (start: string, end: string): number => {
  if (!start || !end) return 0
  const s = new Date(`${start}T00:00:00Z`).getTime()
  const e = new Date(`${end}T00:00:00Z`).getTime()
  return Math.round((e - s) / (1000 * 60 * 60 * 24))
}

const todayIso = () => new Date().toISOString().slice(0, 10)
const isoMinusDays = (d: number) => {
  const t = new Date()
  t.setDate(t.getDate() - d)
  return t.toISOString().slice(0, 10)
}

const ConfigureStep: React.FC<ConfigureStepProps> = ({ config, properties, onChange, onNext, onCancel }) => {
  const validationError = useMemo(() => {
    if (!config.startDate || !config.endDate) return 'Pick a start and end date'
    if (config.startDate > config.endDate) return 'Start date must be on or before end date'
    if (daysBetween(config.startDate, config.endDate) > MAX_RANGE_DAYS) {
      return `Date range cannot exceed ${MAX_RANGE_DAYS} days`
    }
    if (config.sources.length === 0) return 'Pick at least one source'
    if (config.propertyIds.length === 0) return 'Select at least one property'
    return null
  }, [config])

  const applyPreset = (days: number) => {
    onChange({ ...config, startDate: isoMinusDays(days), endDate: todayIso() })
  }

  const toggleSource = (s: SyncSource) => {
    const has = config.sources.includes(s)
    if (has && config.sources.length === 1) return // must keep at least one
    onChange({
      ...config,
      sources: has ? config.sources.filter((x) => x !== s) : [...config.sources, s],
    })
  }

  const togglePropertyId = (id: string) => {
    const has = config.propertyIds.includes(id)
    onChange({
      ...config,
      propertyIds: has ? config.propertyIds.filter((x) => x !== id) : [...config.propertyIds, id],
    })
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Date range */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDaysIcon className="w-5 h-5 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900">Date range</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={config.startDate}
              max={config.endDate || undefined}
              onChange={(e) => onChange({ ...config, startDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={config.endDate}
              min={config.startDate || undefined}
              onChange={(e) => onChange({ ...config, endDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[7, 14, 30, 60, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => applyPreset(d)}
              className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-full transition-colors"
            >
              Last {d} days
            </button>
          ))}
        </div>
      </section>

      {/* Date field */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter by</h3>
        <div className="grid grid-cols-2 gap-2">
          {(['checkout', 'checkin'] as SyncDateField[]).map((field) => {
            const active = config.dateField === field
            return (
              <button
                key={field}
                type="button"
                onClick={() => onChange({ ...config, dateField: field })}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  active
                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {field === 'checkout' ? 'Checkout date' : 'Check-in date'}
                <p className="text-[11px] text-gray-500 mt-1 font-normal">
                  {field === 'checkout' ? 'Cleaning project date' : 'Guest arrival date'}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Sources */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Where to look</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => toggleSource('local')}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all ${
              config.sources.includes('local')
                ? 'border-purple-500 bg-purple-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <ServerStackIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.sources.includes('local') ? 'text-purple-600' : 'text-gray-400'}`} />
            <div>
              <p className={`text-sm font-medium ${config.sources.includes('local') ? 'text-purple-700' : 'text-gray-700'}`}>Local DB</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Bookings already imported but with no cleaning project</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => toggleSource('pms')}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all ${
              config.sources.includes('pms')
                ? 'border-purple-500 bg-purple-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <CloudIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.sources.includes('pms') ? 'text-purple-600' : 'text-gray-400'}`} />
            <div>
              <p className={`text-sm font-medium ${config.sources.includes('pms') ? 'text-purple-700' : 'text-gray-700'}`}>PMS pull</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Re-fetch from Hostaway / Hospitable for missing webhooks</p>
            </div>
          </button>
        </div>
      </section>

      {/* Property scope */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BuildingOfficeIcon className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-900">Properties</h3>
          </div>
          <span className="text-xs text-gray-500">
            {config.propertyIds.length} of {properties.length} selected
          </span>
        </div>
        <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {properties.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">No properties available</div>
          )}
          {properties.map((p) => {
            const checked = config.propertyIds.includes(p.id)
            return (
              <label
                key={p.id}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePropertyId(p.id)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-800">{p.listingName}</span>
                {p.address && <span className="text-xs text-gray-400 ml-auto truncate">{p.address}</span>}
              </label>
            )
          })}
        </div>
        {properties.length > 0 && (
          <div className="mt-2 flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => onChange({ ...config, propertyIds: properties.map((p) => p.id) })}
              disabled={config.propertyIds.length === properties.length}
              className="text-purple-600 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
            >
              Select all
            </button>
            <span className="text-gray-300">·</span>
            <button
              type="button"
              onClick={() => onChange({ ...config, propertyIds: [] })}
              disabled={config.propertyIds.length === 0}
              className="text-gray-500 hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        )}
      </section>

      {validationError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-3 py-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg"
        >
          {validationError}
        </motion.div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!!validationError}
          className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Next: Review candidates
        </button>
      </div>
    </div>
  )
}

export default ConfigureStep
