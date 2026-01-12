'use client'

import { ReactNode, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface DualModalContainerProps {
  isOpen: boolean
  onClose: () => void
  primaryModal: ReactNode
  secondaryModal: ReactNode
  isSecondaryOpen: boolean
  onSecondaryClose: () => void
  primaryStyle?: string
  secondaryStyle?: string
  zIndex?: number
}

const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30
}

const primaryVariants = {
  solo: { x: 0 },
  paired: { x: -140 }
}

const secondaryVariants = {
  hidden: { x: 300, opacity: 0, scale: 0.95 },
  visible: { x: 0, opacity: 1, scale: 1 },
  exit: { x: 300, opacity: 0, scale: 0.95 }
}

const DualModalContainer: React.FC<DualModalContainerProps> = ({
  isOpen,
  onClose,
  primaryModal,
  secondaryModal,
  isSecondaryOpen,
  onSecondaryClose,
  primaryStyle = 'p-6 max-w-lg w-11/12 max-h-[90vh]',
  secondaryStyle = 'p-5 w-80 max-h-[80vh]',
  zIndex = 60
}) => {
  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isSecondaryOpen) {
        onSecondaryClose()
      } else {
        onClose()
      }
    }
  }, [isSecondaryOpen, onSecondaryClose, onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSecondaryOpen) {
      onSecondaryClose()
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
      />

      {/* Modal pair container */}
      <div className="relative flex items-start gap-4 z-10">
        {/* Primary Modal */}
        <motion.div
          className={`relative bg-white rounded-2xl shadow-2xl overflow-y-auto ${primaryStyle}`}
          variants={primaryVariants}
          initial="solo"
          animate={isSecondaryOpen ? "paired" : "solo"}
          transition={springConfig}
        >
          {primaryModal}
        </motion.div>

        {/* Secondary Modal */}
        <AnimatePresence>
          {isSecondaryOpen && (
            <motion.div
              className={`relative bg-white rounded-2xl shadow-2xl overflow-y-auto ${secondaryStyle}`}
              variants={secondaryVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={springConfig}
            >
              {secondaryModal}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default DualModalContainer
