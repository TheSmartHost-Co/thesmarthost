'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { PhotoIcon, ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getLogos, uploadLogo, deleteLogo } from '@/services/reportService'
import type { Logo } from '@/services/types/report'
import { useNotificationStore } from '@/store/useNotificationStore'

interface BrandingLogoManagerProps {
  canWrite: boolean
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg']
const MAX_FILE_SIZE = 5 * 1024 * 1024       // 5 MB

// One logo per user. getLogos() returns the caller's logo (0 or 1); uploading
// replaces it (upsert); deleting clears it. No selection step — it's applied
// automatically to reports and paystubs.
const BrandingLogoManager: React.FC<BrandingLogoManagerProps> = ({ canWrite }) => {
  const showNotification = useNotificationStore((s) => s.showNotification)
  const [logo, setLogo] = useState<Logo | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadLogo = async () => {
    setLoading(true)
    try {
      const res = await getLogos()
      if (res.status === 'success') setLogo(res.data[0] ?? null)
    } catch (err) {
      console.error('Error loading logo:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogo()
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      showNotification('Logo must be a PNG or JPEG image', 'error')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      showNotification('Logo must be 5MB or smaller', 'error')
      return
    }

    setUploading(true)
    try {
      const res = await uploadLogo(file)
      if (res.status === 'success' && res.data) {
        setLogo(res.data)
        showNotification(logo ? 'Logo replaced' : 'Logo uploaded', 'success')
      } else {
        showNotification(res.message || 'Failed to upload logo', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to upload logo', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!logo) return
    setRemoving(true)
    try {
      const res = await deleteLogo(logo.id)
      if (res.status === 'success') {
        setLogo(null)
        showNotification('Logo removed', 'success')
      } else {
        showNotification(res.message || 'Failed to remove logo', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to remove logo', 'error')
    } finally {
      setRemoving(false)
    }
  }

  const busy = uploading || removing

  return (
    <div className="flex items-center gap-4">
      {/* Logo preview / empty state */}
      <div className="relative w-20 h-20 flex-shrink-0 rounded-xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
        {loading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        ) : logo?.logoUrl ? (
          <Image
            src={logo.logoUrl}
            alt={logo.originalName}
            fill
            sizes="80px"
            className="object-contain p-2"
            unoptimized
          />
        ) : (
          <PhotoIcon className="w-8 h-8 text-gray-300" />
        )}
      </div>

      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900">Company logo</div>
        <p className="text-xs text-gray-400 mt-0.5">
          {logo ? logo.originalName : 'No logo set'} · PNG or JPEG, up to 5MB
        </p>
        <p className="text-xs text-gray-400">Applied automatically to your paystub and report PDFs.</p>

        {canWrite && (
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="w-4 h-4" />
                  {logo ? 'Replace' : 'Upload'}
                </>
              )}
            </button>
            {logo && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <TrashIcon className="w-4 h-4" />
                {removing ? 'Removing…' : 'Remove'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BrandingLogoManager
