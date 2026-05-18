'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronRightIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { useAuditHistory } from '@/hooks/useAuditHistory'
import { computeDiff } from '@/services/auditService'
import { formatFieldName } from '@/services/fieldValuesChangedService'
import type { AuditEntityType, AuditEvent } from '@/services/types/audit'
import AuditTraceModal from './AuditTraceModal'
import { ActionBadge, ActionDot, formatValue, getEventLabel } from './shared'

interface Props {
  entityType: AuditEntityType
  entityId: string
}

export default function AuditHistoryPanel({ entityType, entityId }: Props) {
  const { t } = useTranslation('audit')
  const { events, loading, error, refresh } = useAuditHistory(entityType, entityId, { limit: 100 })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [traceContext, setTraceContext] = useState<{ correlationId: string; highlightId: string | null } | null>(null)

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ClockIcon className="h-5 w-5" />
        {t('panel.title')}
        {events.length > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
            {events.length}
          </span>
        )}
      </h3>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-sm text-gray-600">{t('loading')}</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="px-2 py-1 text-xs font-medium text-red-700 bg-white border border-red-200 rounded hover:bg-red-100 transition-colors cursor-pointer"
          >
            {t('buttons.retry')}
          </button>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-center py-6">
          <ClockIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">{t('noHistory')}</p>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden bg-white">
          {events.map(event => (
            <EventRow
              key={event.id}
              event={event}
              isExpanded={expandedId === event.id}
              onToggle={() => setExpandedId(prev => prev === event.id ? null : event.id)}
              onOpenTrace={() => setTraceContext({ correlationId: event.correlationId, highlightId: event.id })}
            />
          ))}
        </ul>
      )}

      {traceContext && (
        <AuditTraceModal
          correlationId={traceContext.correlationId}
          highlightId={traceContext.highlightId}
          onClose={() => setTraceContext(null)}
        />
      )}
    </div>
  )
}

function EventRow({
  event, isExpanded, onToggle, onOpenTrace,
}: {
  event: AuditEvent
  isExpanded: boolean
  onToggle: () => void
  onOpenTrace: () => void
}) {
  const { t } = useTranslation('audit')
  const diff = computeDiff(event)
  const label = getEventLabel(event, t)
  const actorBadge = `${event.actorType}${event.actorSource ? `/${event.actorSource}` : ''}`

  return (
    <li>
      <div className="flex items-center gap-2 hover:bg-gray-50 transition-colors">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 min-w-0 flex items-center gap-3 text-left px-4 py-3 cursor-pointer"
        >
          <ChevronRightIcon
            className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
          />
          <ActionDot action={event.action} />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm text-gray-900 truncate">{label}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {new Date(event.createdAt).toLocaleString()}
              <span className="mx-1.5 text-gray-300">·</span>
              <span className="font-mono">{actorBadge}</span>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0 pr-4">
          <ActionBadge action={event.action} t={t} />
          <button
            type="button"
            onClick={onOpenTrace}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            {t('buttons.viewTrace')}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-1 bg-gray-50">
          <div className="ml-7 rounded border border-gray-200 bg-white p-3 text-xs space-y-3">
            {diff.length === 0 ? (
              <div className="text-gray-500 italic">{t('panel.noFieldChanges')}</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="font-medium pr-4 pb-2">{t('panel.fieldHeader')}</th>
                    <th className="font-medium pr-4 pb-2">{t('panel.beforeHeader')}</th>
                    <th className="font-medium pb-2">{t('panel.afterHeader')}</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.map(d => (
                    <tr key={d.field} className="align-top border-b border-gray-50 last:border-0">
                      <td className="font-mono pr-4 py-1.5 text-gray-700">{formatFieldName(d.field)}</td>
                      <td className="font-mono pr-4 py-1.5 text-red-600 break-all">{formatValue(d.before)}</td>
                      <td className="font-mono py-1.5 text-green-700 break-all">{formatValue(d.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <details className="pt-2 border-t border-gray-100">
                <summary className="font-medium text-gray-600 cursor-pointer hover:text-gray-900">
                  {t('panel.metadata')}
                </summary>
                <pre className="mt-2 text-[11px] whitespace-pre-wrap text-gray-700 bg-gray-50 rounded p-2 max-h-48 overflow-auto">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </details>
            )}
            {event.webhookAuditLogId && (
              <div className="text-[11px] text-gray-500">
                {t('panel.webhookPayload')}: <span className="font-mono">{event.webhookAuditLogId}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
