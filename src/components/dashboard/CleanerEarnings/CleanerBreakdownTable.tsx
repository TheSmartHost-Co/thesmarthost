'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import type { CleanerEarningEntry, CleanerPropertyEarning } from '@/services/types/cleanerEarnings'

interface CleanerBreakdownTableProps {
  cleaners: CleanerEarningEntry[]
  onCleanerClick: (cleanerId: string) => void
  isLoading?: boolean
}

function formatCAD(value: number): string {
  return `$${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatRate(rateType: string | null, rateAmount: number | null): string {
  if (!rateType || rateAmount == null) return '-'
  switch (rateType) {
    case 'per_project': return `$${rateAmount}/project`
    case 'hourly': return `$${rateAmount}/hr`
    case 'per_room': return `$${rateAmount}/room`
    default: return `$${rateAmount}`
  }
}

const PropertyRow: React.FC<{ property: CleanerPropertyEarning }> = ({ property }) => {
  const { t } = useTranslation('dashboard')
  return (
    <tr className="text-xs text-gray-600 bg-gray-50/50">
      <td className="pl-10 pr-3 py-2 font-medium text-gray-700">{property.propertyName}</td>
      <td className="px-3 py-2 text-right">{formatCAD(property.completedEarnings)}</td>
      <td className="px-3 py-2 text-right">{formatCAD(property.expectedEarnings)}</td>
      <td className="px-3 py-2 text-right">{property.numProjects}</td>
      <td className="px-3 py-2 text-right">{formatRate(property.rateType, property.rateAmount)}</td>
      <td className="px-3 py-2" />
    </tr>
  )
}

const CleanerRow: React.FC<{
  cleaner: CleanerEarningEntry
  isExpanded: boolean
  onToggle: () => void
  onFilter: () => void
}> = ({ cleaner, isExpanded, onToggle, onFilter }) => {
  const { t } = useTranslation('dashboard')

  return (
    <>
      <tr
        onClick={onToggle}
        className="group cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
      >
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            </motion.div>
            <span className="font-medium text-sm text-gray-900">{cleaner.cleanerName}</span>
          </div>
        </td>
        <td className="px-3 py-3 text-right text-sm font-medium text-green-700">
          {formatCAD(cleaner.completedEarnings)}
        </td>
        <td className="px-3 py-3 text-right text-sm font-medium text-blue-700">
          {formatCAD(cleaner.expectedEarnings)}
        </td>
        <td className="px-3 py-3 text-right text-sm text-gray-700">
          {cleaner.numProjects}
        </td>
        <td className="px-3 py-3 text-right text-sm text-gray-700">
          {cleaner.projectsPerWeek.toFixed(1)}/wk
        </td>
        <td className="px-3 py-3 text-right text-sm text-gray-700">
          {cleaner.totalHoursWorked.toFixed(1)}h
        </td>
      </tr>

      <AnimatePresence>
        {isExpanded && cleaner.properties.length > 0 && (
          <tr>
            <td colSpan={6} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <table className="w-full">
                  <tbody>
                    {cleaner.properties.map((property) => (
                      <PropertyRow key={property.propertyId} property={property} />
                    ))}
                  </tbody>
                </table>
                <div className="px-10 py-2 border-t border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); onFilter() }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    {t('cleanerEarnings.filterToCleaner', { name: cleaner.cleanerName })}
                  </button>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

const CleanerBreakdownTable: React.FC<CleanerBreakdownTableProps> = ({
  cleaners,
  onCleanerClick,
  isLoading,
}) => {
  const { t } = useTranslation('dashboard')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (cleanerId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(cleanerId)) {
        next.delete(cleanerId)
      } else {
        next.add(cleanerId)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!cleaners || cleaners.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('cleanerEarnings.cleanerBreakdown')}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left font-medium">{t('cleanerEarnings.cleaner')}</th>
              <th className="px-3 py-2.5 text-right font-medium">{t('cleanerEarnings.completedEarnings')}</th>
              <th className="px-3 py-2.5 text-right font-medium">{t('cleanerEarnings.expectedEarnings')}</th>
              <th className="px-3 py-2.5 text-right font-medium">{t('cleanerEarnings.projects')}</th>
              <th className="px-3 py-2.5 text-right font-medium">{t('cleanerEarnings.projectsPerWeek')}</th>
              <th className="px-3 py-2.5 text-right font-medium">{t('cleanerEarnings.hours')}</th>
            </tr>
          </thead>
          <tbody>
            {cleaners.map((cleaner) => (
              <CleanerRow
                key={cleaner.cleanerId}
                cleaner={cleaner}
                isExpanded={expandedIds.has(cleaner.cleanerId)}
                onToggle={() => toggleExpand(cleaner.cleanerId)}
                onFilter={() => onCleanerClick(cleaner.cleanerId)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CleanerBreakdownTable
