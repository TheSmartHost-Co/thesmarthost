'use client'

import React, { useState, useEffect, useRef } from 'react'
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline'
import { createPortal } from 'react-dom'

export interface ActionItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  className?: string
  variant?: 'default' | 'danger'
}

interface TableActionsDropdownProps {
  actions: ActionItem[]
  itemId: string
}

const TableActionsDropdown: React.FC<TableActionsDropdownProps> = ({
  actions,
  itemId,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest(`[data-dropdown-id="${itemId}"]`)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen, itemId])

  const handleActionClick = (action: ActionItem) => {
    action.onClick()
    setIsOpen(false)
  }

  const calculateDropdownPosition = () => {
  if (!buttonRef.current) return
  const rect = buttonRef.current.getBoundingClientRect()

  const dropdownWidth = 192
  const itemHeight = 36
  const dropdownHeight = Math.max(itemHeight * actions.length, 40)
  const gap = 8

  // Viewport-based for position: fixed
  let top = rect.top
  let left = rect.right + gap

  // Flip horizontally if needed
  if (left + dropdownWidth > window.innerWidth - 8) {
    left = rect.left - dropdownWidth - gap
  }
  // Clamp vertically if needed
  if (top + dropdownHeight > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - dropdownHeight - 8)
  }

  setDropdownPosition({ top, left })
}

  const handleToggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen) {
      calculateDropdownPosition()
    }
    setIsOpen(!isOpen)
  }

  const getActionClassName = (action: ActionItem) => {
    const baseClass = "cursor-pointer flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
    const variantClass = action.variant === 'danger' ? 'text-red-600' : 'text-gray-700'
    return `${baseClass} ${variantClass} ${action.className || ''}`
  }

  const dropdownContent = isOpen && (
    <div 
      className="fixed w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
      }}
    >
      <div className="py-1">
        {actions.map((action, index) => {
          const IconComponent = action.icon
          return (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={getActionClassName(action)}
            >
              <IconComponent className="h-4 w-4 mr-3" />
              {action.label}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      <div data-dropdown-id={itemId}>
        <button 
          ref={buttonRef}
          onClick={handleToggleDropdown}
          className="cursor-pointer text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
        >
          <EllipsisVerticalIcon className="h-5 w-5" />
        </button>
      </div>
      
      {typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  )
}

export default TableActionsDropdown