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
    <UploadWizard
      onComplete={handleWizardComplete}
      onCancel={handleWizardCancel}
    />
  )
}