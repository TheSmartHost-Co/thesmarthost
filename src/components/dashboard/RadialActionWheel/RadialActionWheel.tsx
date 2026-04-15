'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  PlusIcon,
  XMarkIcon,
  UserPlusIcon,
  HomeModernIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowUpTrayIcon,
  CameraIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'

export interface WheelAction {
  id: string
  label: string
  icon: React.ReactNode
  color: string       // Tailwind-compatible hex for the icon bg
  onClick: () => void
}

interface RadialActionWheelProps {
  actions: WheelAction[]
}

const RADIUS_DESKTOP = 160
const RADIUS_MOBILE = 120
const ITEM_SIZE_DESKTOP = 64
const ITEM_SIZE_MOBILE = 52

export default function RadialActionWheel({ actions }: RadialActionWheelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useIsMobile()
  const radius = isMobile ? RADIUS_MOBILE : RADIUS_DESKTOP
  const itemSize = isMobile ? ITEM_SIZE_MOBILE : ITEM_SIZE_DESKTOP

  const toggle = useCallback(() => setIsOpen(prev => !prev), [])
  const close = useCallback(() => setIsOpen(false), [])

  const handleAction = useCallback((action: WheelAction) => {
    close()
    // Small delay so the close animation starts before the modal opens
    setTimeout(() => action.onClick(), 150)
  }, [close])

  // Calculate positions evenly around a circle
  const getPosition = (index: number, total: number) => {
    // Start from top (-90 degrees) and go clockwise
    const angleStep = (2 * Math.PI) / total
    const angle = -Math.PI / 2 + angleStep * index
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  }

  return (
    <>
      {/* FAB Button — fixed bottom-right */}
      <motion.button
        onClick={toggle}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-gray-900/20 transition-colors"
        style={{
          background: isOpen
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #1e293b, #0f172a)',
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 135 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <PlusIcon className="h-7 w-7 text-white" strokeWidth={2.5} />
      </motion.button>

      {/* Radial Wheel Portal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[60] flex items-center justify-center"
              >
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 backdrop-blur-md"
                  onClick={close}
                />

                {/* Center label */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: 0.1 }}
                  className="absolute z-10"
                >
                  <div className={`flex items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm ${isMobile ? 'h-16 w-16' : 'h-20 w-20'}`}>
                    <SparklesIcon className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white/80`} />
                  </div>
                </motion.div>

                {/* Action Items — radial layout */}
                {actions.map((action, index) => {
                  const pos = getPosition(index, actions.length)
                  return (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                      animate={{
                        opacity: 1,
                        x: pos.x,
                        y: pos.y,
                        scale: 1,
                      }}
                      exit={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 22,
                        delay: index * 0.04,
                      }}
                      className="absolute z-10 flex flex-col items-center"
                    >
                      <motion.button
                        onClick={() => handleAction(action)}
                        className="group flex flex-col items-center gap-2"
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.92 }}
                      >
                        <div
                          className="flex items-center justify-center rounded-2xl shadow-lg transition-shadow group-hover:shadow-xl"
                          style={{
                            width: itemSize,
                            height: itemSize,
                            background: `linear-gradient(135deg, ${action.color}, ${adjustColor(action.color, -30)})`,
                            boxShadow: `0 8px 24px ${action.color}40`,
                          }}
                        >
                          <div className={`text-white ${isMobile ? '[&>svg]:h-6 [&>svg]:w-6' : ''}`}>{action.icon}</div>
                        </div>
                        <span className={`text-center font-medium leading-tight text-white drop-shadow-md ${isMobile ? 'max-w-[72px] text-[10px]' : 'max-w-[90px] text-[11px]'}`}>
                          {action.label}
                        </span>
                      </motion.button>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}

// --- Default action configs ---

export function getDefaultDashboardActions(handlers: {
  onAddClient: () => void
  onAddProperty: () => void
  onAddCleaner: () => void
  onAddTeamMember: () => void
  onGenerateReport: () => void
  onCreateProject: () => void
  onUploadCSV: () => void
  onScanReceipt: () => void
}): WheelAction[] {
  return [
    {
      id: 'add-client',
      label: 'Add Client',
      icon: <UserPlusIcon className="h-7 w-7" />,
      color: '#3B82F6',
      onClick: handlers.onAddClient,
    },
    {
      id: 'add-property',
      label: 'Add Property',
      icon: <HomeModernIcon className="h-7 w-7" />,
      color: '#10B981',
      onClick: handlers.onAddProperty,
    },
    {
      id: 'generate-report',
      label: 'Generate Report',
      icon: <DocumentTextIcon className="h-7 w-7" />,
      color: '#F59E0B',
      onClick: handlers.onGenerateReport,
    },
    {
      id: 'create-project',
      label: 'Create Project',
      icon: <WrenchScrewdriverIcon className="h-7 w-7" />,
      color: '#8B5CF6',
      onClick: handlers.onCreateProject,
    },
    {
      id: 'upload-csv',
      label: 'Upload CSV',
      icon: <ArrowUpTrayIcon className="h-7 w-7" />,
      color: '#06B6D4',
      onClick: handlers.onUploadCSV,
    },
    {
      id: 'scan-receipt',
      label: 'Scan Receipt',
      icon: <CameraIcon className="h-7 w-7" />,
      color: '#EC4899',
      onClick: handlers.onScanReceipt,
    },
    {
      id: 'add-cleaner',
      label: 'Add Cleaner',
      icon: <SparklesIcon className="h-7 w-7" />,
      color: '#14B8A6',
      onClick: handlers.onAddCleaner,
    },
    {
      id: 'add-team-member',
      label: 'Team Member',
      icon: <UserGroupIcon className="h-7 w-7" />,
      color: '#F97316',
      onClick: handlers.onAddTeamMember,
    },
  ]
}

// --- Color utility ---
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
