'use client'

import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  PERMISSION_TEMPLATES,
  type Permissions,
  type PermissionKey,
  type PermissionLevel,
} from '@/constants/permissionTemplates'
import {
  HomeIcon,
  FolderIcon,
  BookOpenIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  CogIcon,
  ShieldCheckIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PermissionEditorProps {
  permissions: Permissions
  onChange: (permissions: Permissions) => void
  readOnly?: boolean
}

// ---------------------------------------------------------------------------
// Section groupings (mirrors the ManagerSidebar groups)
// ---------------------------------------------------------------------------

interface PermissionSection {
  label: string
  icon: React.ComponentType<{ className?: string }>
  keys: PermissionKey[]
}

const SECTIONS: PermissionSection[] = [
  {
    label: 'General',
    icon: HomeIcon,
    keys: ['dashboard'],
  },
  {
    label: 'Portfolio',
    icon: FolderIcon,
    keys: ['clients', 'properties'],
  },
  {
    label: 'Bookings',
    icon: BookOpenIcon,
    keys: ['bookings', 'incoming_bookings', 'upload_bookings'],
  },
  {
    label: 'Reports',
    icon: DocumentTextIcon,
    keys: ['reports', 'scheduled_reports', 'report_templates'],
  },
  {
    label: 'Turnover',
    icon: WrenchScrewdriverIcon,
    keys: ['turnover', 'checklists', 'supply_lists', 'cleaners', 'invoices'],
  },
  {
    label: 'Financial',
    icon: CurrencyDollarIcon,
    keys: ['expenses', 'receipts', 'analytics'],
  },
  {
    label: 'AI Automations',
    icon: BoltIcon,
    keys: [
      'automation_dashboard',
      'automation_review_nudge',
      'automation_guest_review',
      'automation_message',
    ],
  },
  {
    label: 'System',
    icon: CogIcon,
    keys: ['client_portal', 'whats_new', 'settings'],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LEVEL_OPTIONS: { value: PermissionLevel; labelKey: string }[] = [
  { value: 'none', labelKey: 'permNone' },
  { value: 'read', labelKey: 'permRead' },
  { value: 'read-write', labelKey: 'permReadWrite' },
]

/** Detect which template key matches the current permissions, or 'custom'. */
function detectTemplate(permissions: Permissions): string {
  const templateEntries = Object.entries(PERMISSION_TEMPLATES)
  for (const [key, template] of templateEntries) {
    if (key === 'custom') continue
    const match = PERMISSION_KEYS.every(
      (pk) => permissions[pk] === template.permissions[pk]
    )
    if (match) return key
  }
  return 'custom'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface PermissionRowProps {
  permKey: PermissionKey
  level: PermissionLevel
  onChange: (key: PermissionKey, level: PermissionLevel) => void
  readOnly: boolean
  isLast: boolean
}

const PermissionRow: React.FC<PermissionRowProps> = ({
  permKey,
  level,
  onChange,
  readOnly,
  isLast,
}) => {
  const { t } = useTranslation('settings')
  return (
    <div
      className={`flex items-center justify-between py-2.5 px-3 ${
        !isLast ? 'border-b border-gray-100' : ''
      }`}
    >
      {/* Label */}
      <span className="text-sm text-gray-700 font-medium min-w-[160px]">
        {PERMISSION_LABELS[permKey]}
      </span>

      {/* Radio group */}
      <div className="flex items-center gap-6">
        {LEVEL_OPTIONS.map((opt) => {
          const id = `perm-${permKey}-${opt.value}`
          const isSelected = level === opt.value
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={`flex items-center gap-1.5 cursor-pointer select-none text-sm ${
                readOnly ? 'cursor-default opacity-70' : ''
              } ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-500'}`}
            >
              <input
                type="radio"
                id={id}
                name={`perm-${permKey}`}
                value={opt.value}
                checked={isSelected}
                disabled={readOnly}
                onChange={() => onChange(permKey, opt.value)}
                className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 border-gray-300 cursor-pointer disabled:cursor-default"
              />
              <span className="whitespace-nowrap">{t(opt.labelKey)}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const PermissionEditor: React.FC<PermissionEditorProps> = ({
  permissions,
  onChange,
  readOnly = false,
}) => {
  const { t } = useTranslation('settings')
  const activeTemplate = useMemo(() => detectTemplate(permissions), [permissions])

  const handleTemplateChange = (templateKey: string) => {
    const template = PERMISSION_TEMPLATES[templateKey]
    if (template) {
      onChange({ ...template.permissions })
    }
  }

  const handlePermissionChange = (key: PermissionKey, level: PermissionLevel) => {
    onChange({ ...permissions, [key]: level })
  }

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
          <label
            htmlFor="permission-template"
            className="text-sm font-semibold text-gray-800"
          >
            {t('permissionTemplate')}
          </label>
        </div>
        <select
          id="permission-template"
          value={activeTemplate}
          onChange={(e) => handleTemplateChange(e.target.value)}
          disabled={readOnly}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-default"
        >
          {Object.entries(PERMISSION_TEMPLATES).map(([key, template]) => (
            <option key={key} value={key}>
              {template.label} — {template.description}
            </option>
          ))}
        </select>
      </div>

      {/* Permission Grid Header */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">
            {t('pageResource')}
          </span>
          <div className="flex items-center gap-6">
            {LEVEL_OPTIONS.map((opt) => (
              <span
                key={opt.value}
                className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-[80px] text-center"
              >
                {t(opt.labelKey)}
              </span>
            ))}
          </div>
        </div>

        {/* Permission Rows grouped by section */}
        {SECTIONS.map((section, sIdx) => {
          const SectionIcon = section.icon
          return (
            <div key={section.label}>
              {/* Section Header */}
              <div
                className={`flex items-center gap-2 px-3 py-2 bg-gray-50 ${
                  sIdx > 0 ? 'border-t border-gray-200' : ''
                }`}
              >
                <SectionIcon className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {section.label}
                </span>
              </div>

              {/* Rows */}
              {section.keys.map((key, kIdx) => (
                <PermissionRow
                  key={key}
                  permKey={key}
                  level={permissions[key]}
                  onChange={handlePermissionChange}
                  readOnly={readOnly}
                  isLast={kIdx === section.keys.length - 1}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PermissionEditor
