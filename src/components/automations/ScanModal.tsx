'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'

interface ScanModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (startDate: string, endDate: string) => Promise<void>
  scanning: boolean
}

export default function ScanModal({ isOpen, onClose, onScan, scanning }: ScanModalProps) {
  const { t } = useTranslation('dashboard')
  const today = new Date().toISOString().substring(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)

  const [startDate, setStartDate] = useState(weekAgo)
  const [endDate, setEndDate] = useState(today)

  const presets = [
    { label: 'Last 24h', days: 1 },
    { label: 'Last 3 days', days: 3 },
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 14 days', days: 14 },
    { label: 'Last 30 days', days: 30 },
  ]

  const applyPreset = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(start.toISOString().substring(0, 10))
    setEndDate(end.toISOString().substring(0, 10))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-md">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('automations.scanForCheckouts')}</h2>
        <p className="text-sm text-gray-500 mb-5">{t('automations.scanDescription')}</p>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {presets.map(p => (
            <button
              key={p.days}
              onClick={() => applyPreset(p.days)}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-full transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('automations.from')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('automations.to')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={today}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <button
          onClick={() => onScan(startDate, endDate)}
          disabled={scanning || !startDate || !endDate}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? t('automations.scanning') : t('automations.scanForCheckouts')}
        </button>
      </div>
    </Modal>
  )
}
