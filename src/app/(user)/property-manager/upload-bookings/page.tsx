"use client"

import { useRouter } from 'next/navigation'
import UploadWizard from '@/components/upload-wizard/UploadWizard'

export default function UploadBookingsPage() {
  const router = useRouter()

  const handleWizardComplete = () => {
    // Redirect to bookings page or dashboard after completion
    router.push('/property-manager/bookings')
  }

  const handleWizardCancel = () => {
    // Redirect back to bookings page if user cancels
    router.push('/property-manager/bookings')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Bookings</h1>
          <p className="text-gray-600">Import booking data from your property management system</p>
        </div>
      </div>

      {/* Upload Wizard */}
      <UploadWizard
        onComplete={handleWizardComplete}
        onCancel={handleWizardCancel}
      />
    </div>
  )
}