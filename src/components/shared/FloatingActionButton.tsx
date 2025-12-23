'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  XMarkIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  UserPlusIcon,
  HomeModernIcon
} from '@heroicons/react/24/outline'

interface FloatingActionButtonProps {
  onUploadCSV: () => void
  onGenerateReport: () => void
  onNewClient: () => void
  onNewProperty: () => void
}

interface ActionButton {
  icon: React.ElementType
  label: string
  onClick: () => void
  color: string
  bgColor: string
  hoverColor: string
}

export function FloatingActionButton({
  onUploadCSV,
  onGenerateReport,
  onNewClient,
  onNewProperty
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const actions: ActionButton[] = [
    {
      icon: DocumentArrowUpIcon,
      label: 'Upload CSV',
      onClick: () => {
        onUploadCSV()
        setIsOpen(false)
      },
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      hoverColor: 'hover:bg-amber-200'
    },
    {
      icon: DocumentTextIcon,
      label: 'Generate Report',
      onClick: () => {
        onGenerateReport()
        setIsOpen(false)
      },
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      hoverColor: 'hover:bg-amber-200'
    },
    {
      icon: UserPlusIcon,
      label: 'New Client',
      onClick: () => {
        onNewClient()
        setIsOpen(false)
      },
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      hoverColor: 'hover:bg-blue-200'
    },
    {
      icon: HomeModernIcon,
      label: 'New Property',
      onClick: () => {
        onNewProperty()
        setIsOpen(false)
      },
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      hoverColor: 'hover:bg-blue-200'
    }
  ]

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Buttons - Expand Upward */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 space-y-3"
          >
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    delay: index * 0.05,
                    duration: 0.2,
                    ease: 'easeOut'
                  }
                }}
                exit={{
                  opacity: 0,
                  y: 20,
                  scale: 0.8,
                  transition: {
                    delay: (actions.length - index - 1) * 0.05,
                    duration: 0.15
                  }
                }}
                onClick={action.onClick}
                className={`flex items-center gap-3 px-4 py-3 ${action.bgColor} ${action.hoverColor} rounded-full shadow-lg transition-all hover:shadow-xl group`}
              >
                <action.icon className={`h-5 w-5 ${action.color}`} />
                <span className={`text-sm font-medium ${action.color} whitespace-nowrap`}>
                  {action.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <PlusIcon className="h-6 w-6" />
        )}
      </motion.button>

      {/* Overlay to close when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
