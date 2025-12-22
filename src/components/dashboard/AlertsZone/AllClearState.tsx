'use client'

import { CheckCircleIcon } from '@heroicons/react/24/outline'

interface AllClearStateProps {
  lastChecked: string
}

export const AllClearState: React.FC<AllClearStateProps> = ({ lastChecked }) => {
  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <CheckCircleIcon className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-green-900">All properties up to date</p>
          <p className="text-sm text-green-700">Last checked: {new Date(lastChecked).toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
