'use client'

import { useRouter } from 'next/navigation'
import { EyeIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useImpersonationStore } from '@/store/useImpersonationStore'

export default function ImpersonationBanner() {
  const { target, isImpersonating, stopImpersonation } = useImpersonationStore()
  const router = useRouter()

  if (!isImpersonating || !target) return null

  const handleExit = () => {
    const returnPath = target.type === 'client'
      ? '/property-manager/clients'
      : '/property-manager/cleaners'
    stopImpersonation()
    router.push(returnPath)
  }

  const roleLabel = target.role === 'CLIENT' ? 'Client' : 'Cleaner'

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2 text-sm font-medium">
        <EyeIcon className="h-4 w-4 shrink-0" />
        <span>
          Viewing as <strong>{target.name}</strong> ({roleLabel})
        </span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
      >
        <XMarkIcon className="h-4 w-4" />
        Exit
      </button>
    </div>
  )
}
