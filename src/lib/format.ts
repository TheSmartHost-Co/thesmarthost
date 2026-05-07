// src/lib/format.ts
//
// Tiny formatting helpers shared across components.

/** Format `amount` with `Intl.NumberFormat`, defaulting to CAD. */
export function formatMoney(
  amount: number | null | undefined,
  currency: string = 'CAD',
): string {
  if (amount == null || !Number.isFinite(amount)) return ''
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Unknown currency code → fall back to a plain number with the code suffix.
    return `${amount.toFixed(2)} ${currency}`
  }
}

/** Format a number of hours as "12.50 hrs" (or "0 hrs" when null). */
export function formatHours(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '0 hrs'
  return `${value.toFixed(2)} hrs`
}
