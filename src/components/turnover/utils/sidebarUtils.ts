export const SIDEBAR_WIDTH_DESKTOP = 200
export const SIDEBAR_WIDTH_MOBILE = 28

export function getSidebarWidth(isMobile: boolean): number {
  return isMobile ? SIDEBAR_WIDTH_MOBILE : SIDEBAR_WIDTH_DESKTOP
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 0) return '??'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

const BADGE_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#84cc16', // lime
]

export function getBadgeColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  }
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length]
}
