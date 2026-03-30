export const TAX_RATES = {
  hst: { rate: 0.13, label: 'HST', pct: '13%', description: 'Harmonized Sales Tax' },
  gst: { rate: 0.05, label: 'GST', pct: '5%', description: 'Goods and Services Tax' },
  qst: { rate: 0.09975, label: 'QST', pct: '9.975%', description: 'Quebec Sales Tax' },
} as const

export type TaxType = keyof typeof TAX_RATES

/** Calculate tax amount from subtotal */
export function calcTax(subtotal: number, taxType: TaxType): number {
  return Math.round(subtotal * TAX_RATES[taxType].rate * 100) / 100
}
