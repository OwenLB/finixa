import { describe, it, expect } from 'vitest'
import { formatAmount, formatCurrency } from './formatCurrency'

describe('formatAmount — signe', () => {
  it('préfixe + pour un montant positif', () => {
    expect(formatAmount(5).startsWith('+')).toBe(true)
  })

  it('préfixe - pour un montant négatif', () => {
    expect(formatAmount(-5).startsWith('-')).toBe(true)
  })

  it('aucun signe pour 0 (B-m5 : plus de "-0,00 €")', () => {
    const z = formatAmount(0)
    expect(z.startsWith('-')).toBe(false)
    expect(z.startsWith('+')).toBe(false)
  })
})

describe('formatCurrency — locale', () => {
  it('utilise la locale fournie pour les séparateurs', () => {
    // en-US groupe avec des virgules, fr-FR avec des espaces
    expect(formatCurrency(1234, 'USD', 'en-US')).toContain('1,234')
  })
})
