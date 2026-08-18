'use client'

import React from 'react'
import {
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  WrenchScrewdriverIcon,
  ShoppingCartIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import type { IssueType } from '@/services/types/projectIssue'

// Shared issue-type visual language (icons + tile colors) used by the issue
// wizards and task modals. Keep in sync with IssueType in types/projectIssue.

export const ISSUE_TYPE_ICONS: Record<IssueType, React.ComponentType<{ className?: string }>> = {
  damage: ExclamationTriangleIcon,
  missing_item: QuestionMarkCircleIcon,
  maintenance: WrenchScrewdriverIcon,
  supply: ShoppingCartIcon,
  other: DocumentTextIcon
}

export const ISSUE_TYPE_COLORS: Record<IssueType, string> = {
  damage: 'border-red-300 bg-red-50 text-red-700 hover:border-red-400',
  missing_item: 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400',
  maintenance: 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400',
  supply: 'border-purple-300 bg-purple-50 text-purple-700 hover:border-purple-400',
  other: 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
}

export const ISSUE_TYPE_SELECTED: Record<IssueType, string> = {
  damage: 'ring-2 ring-red-500 border-red-500 bg-red-100',
  missing_item: 'ring-2 ring-amber-500 border-amber-500 bg-amber-100',
  maintenance: 'ring-2 ring-blue-500 border-blue-500 bg-blue-100',
  supply: 'ring-2 ring-purple-500 border-purple-500 bg-purple-100',
  other: 'ring-2 ring-gray-500 border-gray-500 bg-gray-100'
}
