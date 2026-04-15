'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useCleanerEarningsStore } from '@/store/useCleanerEarningsStore'
import { getCleanerEarnings } from '@/services/cleanerEarningsService'
import { useNotificationStore } from '@/store/useNotificationStore'
import CleanerEarningsFilters from './CleanerEarningsFilters'
import MonthlyTrendChart from './MonthlyTrendChart'
import CleanerBreakdownTable from './CleanerBreakdownTable'
import CleanerEarningsEmpty from './CleanerEarningsEmpty'

interface CleanerEarningsSectionProps {
  onCreateProject: () => void
}

function getDefaultDateRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  return {
    startDate: new Date(year, month, 1).toISOString().split('T')[0],
    endDate: new Date(year, month + 2, 0).toISOString().split('T')[0],
  }
}

const CleanerEarningsSection: React.FC<CleanerEarningsSectionProps> = ({ onCreateProject }) => {
  const { t } = useTranslation('dashboard')
  const { data, isLoading, error, setData, setLoading, setError } = useCleanerEarningsStore()
  const { showNotification } = useNotificationStore()

  const [dateRange, setDateRange] = useState(getDefaultDateRange)
  const [selectedCleanerId, setSelectedCleanerId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCleanerEarnings({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        cleanerId: selectedCleanerId || undefined,
      })
      if (res.status === 'success') {
        setData(res.data)
      } else {
        setError(res.message || 'Failed to load cleaner earnings')
        showNotification(res.message || t('cleanerEarnings.failedToLoad'), 'error')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load cleaner earnings'
      setError(message)
      showNotification(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [dateRange, selectedCleanerId, setData, setLoading, setError, showNotification, t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCleanerClick = (cleanerId: string) => {
    setSelectedCleanerId(cleanerId)
  }

  const hasData = data && (data.cleaners.length > 0 || data.monthlyTrend.length > 0)

  if (error && !data) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-red-50 rounded-xl border border-red-200 p-6 text-center"
      >
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={fetchData}
          className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer"
        >
          {t('cleanerEarnings.retry')}
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">
          {t('cleanerEarnings.title')}
        </h2>
        <CleanerEarningsFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedCleanerId={selectedCleanerId}
          onCleanerChange={setSelectedCleanerId}
          cleaners={data?.cleaners || []}
        />
      </div>

      {!isLoading && !hasData ? (
        <CleanerEarningsEmpty onCreateProject={onCreateProject} />
      ) : (
        <>
          <MonthlyTrendChart
            data={data?.monthlyTrend || []}
            isLoading={isLoading}
          />
          <CleanerBreakdownTable
            cleaners={data?.cleaners || []}
            onCleanerClick={handleCleanerClick}
            isLoading={isLoading}
          />
        </>
      )}
    </motion.div>
  )
}

export default CleanerEarningsSection
