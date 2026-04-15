'use client'

import { CheckCircleIcon } from '@heroicons/react/24/outline'

interface AllClearStateProps {
  lastChecked: string
}

export const AllClearState: React.FC<AllClearStateProps> = ({ lastChecked }) => {
  return (
    <div className="flex items-center gap-2.5 py-3 px-4 bg-white border border-gray-200 rounded-lg">
      <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
      <p className="text-sm text-slate-600">All properties up to date</p>
    </div>
  )
}
