'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ListBulletIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useAuditTrace } from '@/hooks/useAuditTrace'
import type { AuditTreeNode } from '@/services/auditService'
import type { AuditEntityType, AuditEvent } from '@/services/types/audit'
import AuditRecordHistoryModal from './AuditRecordHistoryModal'
import { ActionDot, getEventLabel } from './shared'

interface Props {
  correlationId: string
  highlightId: string | null
  onClose: () => void
}

type ViewMode = 'tree' | 'flat'

interface SelectedEvent {
  entityType: AuditEntityType
  entityId: string
  eventId: string
}

export default function AuditTraceModal({ correlationId, highlightId, onClose }: Props) {
  const { t } = useTranslation('audit')
  const { events, tree, loading, error } = useAuditTrace(correlationId)
  const [mode, setMode] = useState<ViewMode>('tree')
  const [selected, setSelected] = useState<SelectedEvent | null>(null)

  const openEvent = (e: Pick<AuditEvent, 'id' | 'entityType' | 'entityId'>) =>
    setSelected({ entityType: e.entityType, entityId: e.entityId, eventId: e.id })

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        style="p-0 max-w-4xl w-11/12 !max-h-[85vh] !overflow-y-hidden flex flex-col"
        zIndex={70}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">{t('trace.title')}</h2>
            <p className="text-[11px] text-gray-500 font-mono truncate">{correlationId}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mr-8">
            <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setMode('tree')}
                className={`px-3 py-1.5 flex items-center gap-1 cursor-pointer transition-colors ${
                  mode === 'tree' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Squares2X2Icon className="h-3.5 w-3.5" /> {t('trace.tree')}
              </button>
              <button
                type="button"
                onClick={() => setMode('flat')}
                className={`px-3 py-1.5 flex items-center gap-1 cursor-pointer transition-colors border-l border-gray-200 ${
                  mode === 'flat' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ListBulletIcon className="h-3.5 w-3.5" /> {t('trace.flat')}
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <div className="text-sm text-gray-500">{t('loading')}</div>}
          {error && (
            <div className="text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded">{error}</div>
          )}
          {!loading && !error && events.length === 0 && (
            <div className="text-sm text-gray-500">{t('trace.empty')}</div>
          )}
          {!loading && !error && events.length > 0 && (
            mode === 'tree'
              ? <TreeView nodes={tree} highlightId={highlightId} onSelect={openEvent} />
              : <FlatView events={events} highlightId={highlightId} onSelect={openEvent} />
          )}
        </div>

        <footer className="px-5 py-2 border-t border-gray-200 text-xs text-gray-500 shrink-0">
          {t('trace.eventCount', { count: events.length })}
        </footer>
      </Modal>

      {selected && (
        <AuditRecordHistoryModal
          entityType={selected.entityType}
          entityId={selected.entityId}
          initialExpandedId={selected.eventId}
          zIndex={80}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

function TreeView({
  nodes, highlightId, onSelect,
}: {
  nodes: AuditTreeNode[]
  highlightId: string | null
  onSelect: (e: AuditEvent) => void
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map(n => (
        <TreeNode key={n.id} node={n} depth={0} highlightId={highlightId} onSelect={onSelect} />
      ))}
    </ul>
  )
}

function TreeNode({
  node, depth, highlightId, onSelect,
}: {
  node: AuditTreeNode
  depth: number
  highlightId: string | null
  onSelect: (e: AuditEvent) => void
}) {
  const { t } = useTranslation('audit')
  const isHighlight = highlightId === node.id
  const label = getEventLabel(node, t)

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(node)}
        style={{ paddingLeft: depth * 16 }}
        className={`w-full flex items-baseline gap-2 py-1 px-2 rounded text-sm text-left cursor-pointer transition-colors ${
          isHighlight ? 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100' : 'hover:bg-blue-50'
        }`}
      >
        <span className="text-[11px] text-gray-400 font-mono shrink-0">
          {new Date(node.createdAt).toISOString().slice(11, 23)}
        </span>
        <ActionDot action={node.action} />
        <span className="font-medium text-gray-900 truncate">{label}</span>
        <span className="text-[11px] text-gray-500 font-mono truncate">
          {node.entityType}/{node.entityId.slice(0, 8)}
        </span>
        <span className="ml-auto text-[11px] text-gray-500 font-mono shrink-0">
          {node.actorType}{node.actorSource ? `/${node.actorSource}` : ''}
        </span>
      </button>
      {node.children.length > 0 && (
        <ul className="ml-3 border-l border-gray-200">
          {node.children.map(c => (
            <TreeNode key={c.id} node={c} depth={depth + 1} highlightId={highlightId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  )
}

function FlatView({
  events, highlightId, onSelect,
}: {
  events: AuditEvent[]
  highlightId: string | null
  onSelect: (e: AuditEvent) => void
}) {
  const { t } = useTranslation('audit')
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
          <th className="py-2 pr-3 font-medium">{t('trace.cols.time')}</th>
          <th className="pr-3 font-medium">{t('trace.cols.entity')}</th>
          <th className="pr-3 font-medium">{t('trace.cols.action')}</th>
          <th className="pr-3 font-medium">{t('trace.cols.actor')}</th>
          <th className="font-medium">{t('trace.cols.label')}</th>
        </tr>
      </thead>
      <tbody>
        {events.map(e => (
          <tr
            key={e.id}
            onClick={() => onSelect(e)}
            className={`border-b border-gray-100 cursor-pointer transition-colors ${
              highlightId === e.id ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-blue-50'
            }`}
          >
            <td className="py-1.5 pr-3 font-mono text-[11px] text-gray-600">
              {new Date(e.createdAt).toISOString().slice(11, 23)}
            </td>
            <td className="pr-3 font-mono text-[11px] text-gray-700">
              {e.entityType}/{e.entityId.slice(0, 8)}
            </td>
            <td className="pr-3">
              <span className="inline-flex items-center gap-1.5">
                <ActionDot action={e.action} />
                {t(`action.${e.action}`)}
              </span>
            </td>
            <td className="pr-3 text-[11px] font-mono text-gray-600">
              {e.actorType}{e.actorSource ? `/${e.actorSource}` : ''}
            </td>
            <td className="text-gray-900">{getEventLabel(e, t)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
