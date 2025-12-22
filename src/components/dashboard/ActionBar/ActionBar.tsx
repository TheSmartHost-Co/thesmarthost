'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CloudArrowUpIcon,
  DocumentChartBarIcon,
  UserPlusIcon,
  HomeModernIcon,
} from '@heroicons/react/24/outline'

interface ActionBarProps {
  onGenerateReport: () => void
  onNewClient: () => void
  onNewProperty: () => void
}

export const ActionBar: React.FC<ActionBarProps> = ({
  onGenerateReport,
  onNewClient,
  onNewProperty,
}) => {
  const router = useRouter()
  const [isSticky, setIsSticky] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleUploadCSV = () => {
    router.push('/property-manager/upload-bookings')
  }

  const baseButtonClass = "px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
  const primaryButtonClass = `${baseButtonClass} bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 hover:shadow-md hover:scale-[1.02]`
  const secondaryButtonClass = `${baseButtonClass} border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 hover:scale-[1.02]`

  return (
    <div
      className={`sticky top-0 z-30 transition-all duration-200 ${
        isSticky
          ? 'bg-white/95 backdrop-blur-sm shadow-md py-3'
          : 'bg-gradient-to-r from-amber-50 to-orange-50 py-4'
      }`}
    >
      <div className="flex flex-wrap gap-3">
        {/* Primary Actions */}
        <button
          onClick={handleUploadCSV}
          className={primaryButtonClass}
        >
          <CloudArrowUpIcon className="w-5 h-5" />
          <span>Upload CSV</span>
        </button>

        <button
          onClick={onGenerateReport}
          className={primaryButtonClass}
        >
          <DocumentChartBarIcon className="w-5 h-5" />
          <span>Generate Report</span>
        </button>

        {/* Secondary Actions */}
        <button
          onClick={onNewClient}
          className={secondaryButtonClass}
        >
          <UserPlusIcon className="w-5 h-5" />
          <span>New Client</span>
        </button>

        <button
          onClick={onNewProperty}
          className={secondaryButtonClass}
        >
          <HomeModernIcon className="w-5 h-5" />
          <span>New Property</span>
        </button>
      </div>
    </div>
  )
}
