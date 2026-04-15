'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { BanknotesIcon, PlusIcon } from '@heroicons/react/24/outline'

interface CleanerEarningsEmptyProps {
  onCreateProject: () => void
}

const CleanerEarningsEmpty: React.FC<CleanerEarningsEmptyProps> = ({ onCreateProject }) => {
  const { t } = useTranslation('dashboard')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-12 text-center"
    >
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <BanknotesIcon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        {t('cleanerEarnings.noData')}
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        {t('cleanerEarnings.noDataDesc')}
      </p>
      <button
        onClick={onCreateProject}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
      >
        <PlusIcon className="w-4 h-4" />
        {t('cleanerEarnings.createProject')}
      </button>
    </motion.div>
  )
}

export default CleanerEarningsEmpty
