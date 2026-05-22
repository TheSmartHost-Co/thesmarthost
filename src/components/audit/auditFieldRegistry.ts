// Maps snake_case foreign-key field names appearing in audit snapshots to the
// entity type they reference. Used by the record-history panel to render
// clickable EntityChips in diff cells.

export type EntityRefType =
  | 'booking'
  | 'property'
  | 'cleaner'
  | 'cleaning_project'

export interface EntityRef {
  entityType: EntityRefType
  entityId: string
}

const FK_FIELD_TO_ENTITY: Record<string, EntityRefType> = {
  booking_id: 'booking',
  next_booking_id: 'booking',
  previous_booking_id: 'booking',
  property_id: 'property',
  cleaner_id: 'cleaner',
  cleaning_project_id: 'cleaning_project',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function resolveEntityRef(field: string, value: unknown): EntityRef | null {
  const entityType = FK_FIELD_TO_ENTITY[field]
  if (!entityType) return null
  if (typeof value !== 'string' || !UUID_RE.test(value)) return null
  return { entityType, entityId: value }
}

// True for audited entity types — only these can have a meaningful audit
// history opened from a tombstone.
const AUDITED_TYPES: ReadonlySet<EntityRefType> = new Set(['booking', 'cleaning_project'])

export function isAudited(entityType: EntityRefType): boolean {
  return AUDITED_TYPES.has(entityType)
}
