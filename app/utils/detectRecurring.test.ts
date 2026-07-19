import { describe, it, expect } from 'vitest'
import { detectRecurringPatterns, nextOccurrenceDate, filterNewSuggestions } from './detectRecurring'
import type { RecurringSuggestion } from './detectRecurring'
import type { ParsedTransaction } from './csvParser'

function p(date: string, name = 'Netflix', amount = -13.49): ParsedTransaction {
  return { name, amount, date: `${date}T12:00:00`, type: 'depense' }
}

describe('detectRecurringPatterns', () => {
  it('détecte un abonnement mensuel régulier (haute confiance)', () => {
    const txs = [p('2026-01-15'), p('2026-02-15'), p('2026-03-15'), p('2026-04-15')]
    const [s] = detectRecurringPatterns(txs)
    expect(s).toBeDefined()
    expect(s!.frequency).toBe('monthly')
    expect(s!.displayName).toBe('Netflix')
    expect(s!.dayOfMonth).toBe(15)
    expect(s!.occurrences).toBe(4)
    expect(s!.amount).toBe(-13.49)
    expect(s!.confidence).toBe('high')
  })

  it('ne détecte rien en dessous du minimum d\'occurrences (3)', () => {
    expect(detectRecurringPatterns([p('2026-01-15'), p('2026-02-15')])).toEqual([])
  })

  it('n\'identifie pas des achats irréguliers comme une récurrence', () => {
    const txs = [
      p('2026-01-03', 'Supermarché', -42.10),
      p('2026-01-05', 'Supermarché', -12.00),
      p('2026-01-19', 'Supermarché', -88.50),
      p('2026-02-02', 'Supermarché', -23.30),
    ]
    const res = detectRecurringPatterns(txs)
    expect(res.every(s => s.displayName !== 'Supermarché')).toBe(true)
  })
})

// Cible les fixes Sprint 1 sur les récurrences (B-C2 / B-M4) : calcul de la
// prochaine occurrence par fréquence, en date locale.
describe('nextOccurrenceDate', () => {
  it('mensuel : même jour, mois suivant', () => {
    expect(nextOccurrenceDate('2026-01-15', 'monthly', 15)).toBe('2026-02-15')
  })

  it('mensuel : clamp du jour sur les mois courts (31 → 28 en février)', () => {
    expect(nextOccurrenceDate('2026-01-31', 'monthly', 31)).toBe('2026-02-28')
  })

  it('mensuel : bascule d\'année', () => {
    expect(nextOccurrenceDate('2026-12-10', 'monthly', 10)).toBe('2027-01-10')
  })

  it('hebdomadaire : +7 jours', () => {
    expect(nextOccurrenceDate('2026-06-01', 'weekly', null)).toBe('2026-06-08')
  })

  it('trimestriel : +3 mois', () => {
    expect(nextOccurrenceDate('2026-01-10', 'quarterly', 10)).toBe('2026-04-10')
  })

  it('annuel : +1 an', () => {
    expect(nextOccurrenceDate('2026-03-05', 'yearly', 5)).toBe('2027-03-05')
  })
})

function sug(partial: Partial<RecurringSuggestion> & Pick<RecurringSuggestion, 'displayName'>): RecurringSuggestion {
  return {
    originalNames: [partial.displayName],
    amount: -10, type: 'depense', frequency: 'monthly', intervalDays: 30,
    score: 0.8, confidence: 'high', occurrences: 3, lastDate: '2026-01-01',
    dayOfMonth: 1, categoryId: null, categorized: false,
    ...partial,
  }
}

describe('filterNewSuggestions', () => {
  it('renvoie tout si aucune récurrence existante', () => {
    const detected = [sug({ displayName: 'Netflix' })]
    expect(filterNewSuggestions(detected, [])).toHaveLength(1)
  })

  it('écarte un doublon de même type et même nom (normalisé)', () => {
    const detected = [sug({ displayName: 'Netflix' }), sug({ displayName: 'Spotify' })]
    const existing = [{ name: 'netflix', type: 'depense' }]
    expect(filterNewSuggestions(detected, existing).map(s => s.displayName)).toEqual(['Spotify'])
  })

  it('matche aussi sur un libellé d\'origine, pas seulement le displayName', () => {
    const detected = [sug({ displayName: 'NETFLIX 01/02', originalNames: ['NETFLIX 01/02', 'Netflix'] })]
    const existing = [{ name: 'Netflix', type: 'depense' }]
    expect(filterNewSuggestions(detected, existing)).toHaveLength(0)
  })

  it('ne dédoublonne pas si le type diffère', () => {
    const detected = [sug({ displayName: 'Loyer', type: 'depense' })]
    const existing = [{ name: 'Loyer', type: 'revenu' }]
    expect(filterNewSuggestions(detected, existing)).toHaveLength(1)
  })
})
