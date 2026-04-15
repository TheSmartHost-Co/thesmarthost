'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface MobileFilterDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  activeCount: number
  title?: string
  children: React.ReactNode
  onClear?: () => void
}

export default function MobileFilterDrawer({
  isOpen,
  onOpenChange,
  activeCount,
  title = 'Filters',
  children,
  onClear,
}: MobileFilterDrawerProps) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, close])

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => onOpenChange(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-gray-300"
      >
        <FunnelIcon className="h-3.5 w-3.5" />
        {title}
        {activeCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
              onClick={close}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) close()
              }}
              className="fixed inset-x-0 bottom-0 z-[71] max-h-[80vh] overflow-hidden rounded-t-2xl bg-white shadow-2xl"
            >
              {/* Drag handle */}
              <div className="flex justify-center py-2">
                <div className="h-1 w-10 rounded-full bg-gray-300" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 pb-3">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <div className="flex items-center gap-2">
                  {onClear && activeCount > 0 && (
                    <button
                      onClick={onClear}
                      className="text-xs font-medium text-red-500 hover:text-red-600"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={close}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: 'calc(80vh - 100px)' }}>
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
