'use client'

import CleanerTurnoverCalendar from '@/components/cleaner-portal/CleanerTurnoverCalendar'

export default function CleanerSchedulePage() {
  return (
    <div className="max-w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">View your upcoming cleaning projects</p>
      </div>
      <CleanerTurnoverCalendar />
    </div>
  )
}
