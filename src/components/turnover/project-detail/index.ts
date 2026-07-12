// Section identifiers for the PM project-detail modal's collapsible sections +
// sticky nav. Order here is the render + nav order.
export const SECTION_IDS = [
  'bookings',
  'checklist',
  'photos',
  'supplies',
  'issues',
  'audit',
] as const

export type SectionId = (typeof SECTION_IDS)[number]

export { default as CollapsibleSection, SECTION_ANIM_MS } from './CollapsibleSection'
export { default as SectionNav } from './SectionNav'
