'use client'

const PLATFORM_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  airbnb: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  booking: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  google: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  direct: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
  'direct-etransfer': { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
  wechalet: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  monsieurchalets: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  vrbo: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  hostaway: { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
}

const PLATFORM_NAMES: Record<string, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  google: 'Google Travel',
  direct: 'Direct',
  'direct-etransfer': 'Direct',
  wechalet: 'WeChalet',
  monsieurchalets: 'Monsieur Chalets',
  vrbo: 'VRBO',
  hostaway: 'Hostaway',
}

// Hex colors for calendar booking bars
export const PLATFORM_BAR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  airbnb: { bg: '#fda4af', text: '#881337', border: '#f43f5e' },
  booking: { bg: '#93c5fd', text: '#1e3a8a', border: '#3b82f6' },
  vrbo: { bg: '#a5b4fc', text: '#312e81', border: '#6366f1' },
  direct: { bg: '#6ee7b7', text: '#064e3b', border: '#10b981' },
  'direct-etransfer': { bg: '#6ee7b7', text: '#064e3b', border: '#10b981' },
  google: { bg: '#fcd34d', text: '#78350f', border: '#f59e0b' },
  wechalet: { bg: '#5eead4', text: '#134e4a', border: '#14b8a6' },
  monsieurchalets: { bg: '#fdba74', text: '#7c2d12', border: '#f97316' },
}

export function formatPlatformName(platform: string): string {
  return PLATFORM_NAMES[platform] || platform || 'Unknown'
}

export function getPlatformBadge(platform: string) {
  const style = PLATFORM_COLORS[platform] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
      {formatPlatformName(platform)}
    </span>
  )
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '-'
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
