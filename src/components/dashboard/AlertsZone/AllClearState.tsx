'use client'

import { CheckCircleIcon } from '@heroicons/react/24/outline'

interface AllClearStateProps {
  lastChecked: string
}

export const AllClearState: React.FC<AllClearStateProps> = ({ lastChecked }) => {
  return (
    <div className="bg-green-50 border-l-4 border-green-500 px-6 py-4 rounded-lg">
      <div className="flex items-center gap-3">
        <CheckCircleIcon className="w-6 h-6 text-green-600" />
        <div>
          <p className="font-medium text-green-900">All properties up to date</p>
          <p className="text-sm text-green-700">Last checked: {new Date(lastChecked).toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
