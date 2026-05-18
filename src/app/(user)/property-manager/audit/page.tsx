'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { searchEvents } from '@/services/auditService'
import type {
  AuditEventSummary,
  AuditSearchFilters,
  AuditEntityType,
  AuditAction,
  AuditActorType,
} from '@/services/types/audit'
import AuditTraceModal from '@/components/audit/AuditTraceModal'
import AuditRecordHistoryModal from '@/components/audit/AuditRecordHistoryModal'
import { ActionBadge } from '@/components/audit/shared'

const PAGE_SIZE = 50

const ENTITY_TYPES: AuditEntityType[] = ['booking', 'cleaning_project', 'incoming_booking']
const ACTIONS: AuditAction[] = ['create', 'update', 'delete']
const ACTOR_TYPES: AuditActorType[] = ['user', 'webhook', 'cron', 'system']

export default function AuditPage() {
  usePermissionGuard('audit')
  const { t } = useTranslation('audit')

  const [filters, setFilters] = useState<AuditSearchFilters>({ limit: PAGE_SIZE, offset: 0 })
  const [results, setResults] = useState<AuditEventSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [traceId, setTraceId] = useState<string | null>(null)
  const [recordView, setRecordView] = useState<{ type: AuditEntityType; id: string } | null>(null)

  // Mirror filters in a ref so runSearch reads the latest value even across
  // rapid successive clicks (e.g. fast pagination) without recreating itself
  // on every keystroke.
  const filtersRef = useRef(filters)
  useEffect(() => { filtersRef.current = filters }, [filters])

  const runSearch = useCallback(async (override?: Partial<AuditSearchFilters>) => {
    const effective = { ...filtersRef.current, ...override }
    filtersRef.current = effective
    setFilters(effective)
    setLoading(true)
    setError(null)
    setHasSearched(true)
    try {
      const res = await searchEvents(effective)
      if (res.status === 'success') {
        setResults(res.data)
        setTotal(res.total)
      } else {
        setError(res.message || t('error'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  // Auto-fetch the most recent events on mount so users see activity without
  // having to click Search first.
  useEffect(() => {
    runSearch({ offset: 0 })
  }, [runSearch])

  const resetFilters = () => {
    setFilters({ limit: PAGE_SIZE, offset: 0 })
    setResults([])
    setTotal(0)
    setHasSearched(false)
    setError(null)
  }

  const offset = filters.offset ?? 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6 flex items-start gap-3">
        <div className="shrink-0 h-11 w-11 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-lg shadow-gray-900/20">
          <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('subtitle')}</p>
        </div>
      </header>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            label={t('filters.entity')}
            value={filters.entityType ?? ''}
            onChange={v => setFilters(f => ({ ...f, entityType: (v || undefined) as AuditEntityType | undefined }))}
            options={['', ...ENTITY_TYPES]}
            renderOption={(o) => o ? t(`entityType.${o as AuditEntityType}`) : t('filters.any')}
          />
          <Select
            label={t('filters.action')}
            value={filters.action ?? ''}
            onChange={v => setFilters(f => ({ ...f, action: (v || undefined) as AuditAction | undefined }))}
            options={['', ...ACTIONS]}
            renderOption={(o) => o ? t(`action.${o as AuditAction}`) : t('filters.any')}
          />
          <Select
            label={t('filters.actorType')}
            value={filters.actorType ?? ''}
            onChange={v => setFilters(f => ({ ...f, actorType: (v || undefined) as AuditActorType | undefined }))}
            options={['', ...ACTOR_TYPES]}
            renderOption={(o) => o ? t(`actorType.${o as AuditActorType}`) : t('filters.any')}
          />
          <TextInput
            label={t('filters.actorSource')}
            placeholder="hostaway, ical-cron, …"
            value={filters.actorSource ?? ''}
            onChange={v => setFilters(f => ({ ...f, actorSource: v || undefined }))}
          />
          <TextInput
            label={t('filters.entityId')}
            value={filters.entityId ?? ''}
            onChange={v => setFilters(f => ({ ...f, entityId: v || undefined }))}
          />
          <TextInput
            label={t('filters.actorId')}
            value={filters.actorId ?? ''}
            onChange={v => setFilters(f => ({ ...f, actorId: v || undefined }))}
          />
          <TextInput
            label={t('filters.from')}
            type="datetime-local"
            value={filters.from ?? ''}
            onChange={v => setFilters(f => ({ ...f, from: v || undefined }))}
          />
          <TextInput
            label={t('filters.to')}
            type="datetime-local"
            value={filters.to ?? ''}
            onChange={v => setFilters(f => ({ ...f, to: v || undefined }))}
          />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => runSearch({ offset: 0 })}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            {t('buttons.search')}
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            {t('buttons.reset')}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">{t('table.when')}</th>
              <th className="px-3 py-2 font-medium">{t('table.entity')}</th>
              <th className="px-3 py-2 font-medium">{t('table.action')}</th>
              <th className="px-3 py-2 font-medium">{t('table.actor')}</th>
              <th className="px-3 py-2 font-medium">{t('table.changedFields')}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-gray-500">
                  <ArrowPathIcon className="h-4 w-4 animate-spin inline mr-2" />
                  {t('loading')}
                </td>
              </tr>
            ) : !hasSearched ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-gray-500">
                  <ClipboardDocumentListIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  {t('promptToSearch')}
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-gray-500">
                  {t('noResults')}
                </td>
              </tr>
            ) : (
              results.map(r => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => setRecordView({ type: r.entityType, id: r.entityId })}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      {r.entityType}/{r.entityId.slice(0, 8)}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <ActionBadge action={r.action} t={t} />
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-gray-600">
                    {r.actorType}{r.actorSource ? `/${r.actorSource}` : ''}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    <span className="line-clamp-1 max-w-md">{r.changedFields.join(', ')}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setTraceId(r.correlationId)}
                      className="text-xs text-blue-600 hover:underline cursor-pointer"
                    >
                      {t('buttons.trace')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {results.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 text-xs text-gray-500 border-t border-gray-100 bg-gray-50">
            <span>
              {t('pagination.range', {
                start: offset + 1,
                end: Math.min(offset + results.length, total),
                total,
              })}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0 || loading}
                onClick={() => runSearch({ offset: Math.max(0, offset - PAGE_SIZE) })}
                className="px-3 py-1 border border-gray-200 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {t('buttons.prev')}
              </button>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => runSearch({ offset: offset + PAGE_SIZE })}
                className="px-3 py-1 border border-gray-200 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {t('buttons.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {traceId && (
        <AuditTraceModal
          correlationId={traceId}
          highlightId={null}
          onClose={() => setTraceId(null)}
        />
      )}

      {recordView && (
        <AuditRecordHistoryModal
          entityType={recordView.type}
          entityId={recordView.id}
          onClose={() => setRecordView(null)}
        />
      )}
    </div>
  )
}

function Select({
  label, value, onChange, options, renderOption,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  renderOption: (o: string) => string
}) {
  return (
    <label className="block text-xs text-gray-500">
      {label}
      <select
        className="block w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => (
          <option key={o} value={o}>{renderOption(o)}</option>
        ))}
      </select>
    </label>
  )
}

function TextInput({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block text-xs text-gray-500">
      {label}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </label>
  )
}

