import { describe, it, expect } from 'vitest'
import { getOccurrenceKey, getDatesInRange } from './recurringService'
import type { RecurringExpense } from '~/types'

// La clé d'occurrence sert à la déduplication réel/virtuel et à la contrainte
// d'unicité en DB — elle doit être stable et correcte par fréquence.
describe('getOccurrenceKey', () => {
  it('mensuel → YYYY-MM', () => {
    expect(getOccurrenceKey('2026-06-15', 'monthly')).toBe('2026-06')
  })

  it('trimestriel → YYYY-Qx', () => {
    expect(getOccurrenceKey('2026-06-15', 'quarterly')).toBe('2026-Q2') // juin = T2
    expect(getOccurrenceKey('2026-01-10', 'quarterly')).toBe('2026-Q1')
    expect(getOccurrenceKey('2026-12-31', 'quarterly')).toBe('2026-Q4')
  })

  it('annuel → YYYY', () => {
    expect(getOccurrenceKey('2026-03-05', 'yearly')).toBe('2026')
  })

  it('hebdomadaire → YYYY-Wxx (semaine ISO 8601)', () => {
    expect(getOccurrenceKey('2026-06-15', 'weekly')).toMatch(/^2026-W\d{2}$/)
  })
})

function rec(p: Partial<RecurringExpense>): RecurringExpense {
  return {
    id: 'r', name: 'Loyer', amount: -1000, type: 'depense', category: '', categorized: false,
    frequency: 'monthly', dayOfMonth: 1, startDate: '2026-01-01', endDate: null,
    accountingOffset: 'same_month', ...p,
  }
}

// Génération des dates d'occurrence dans une plage (cœur des transactions virtuelles).
describe('getDatesInRange', () => {
  it('mensuel : une occurrence par mois dans la plage', () => {
    const dates = getDatesInRange(
      rec({ startDate: '2026-01-05', dayOfMonth: 5 }),
      new Date(2026, 0, 1), new Date(2026, 3, 1), // jan → mar inclus
    )
    expect(dates.map(d => d.slice(0, 10))).toEqual(['2026-01-05', '2026-02-05', '2026-03-05'])
  })

  it('mensuel : clamp du jour (31 → dernier jour du mois court)', () => {
    const dates = getDatesInRange(
      rec({ startDate: '2026-01-31', dayOfMonth: 31 }),
      new Date(2026, 1, 1), new Date(2026, 2, 1), // février seul
    )
    expect(dates.map(d => d.slice(0, 10))).toEqual(['2026-02-28'])
  })

  it('respecte endDate (borne incluse)', () => {
    const dates = getDatesInRange(
      rec({ startDate: '2026-01-05', endDate: '2026-02-05', dayOfMonth: 5 }),
      new Date(2026, 0, 1), new Date(2026, 5, 1),
    )
    expect(dates.map(d => d.slice(0, 10))).toEqual(['2026-01-05', '2026-02-05'])
  })

  it('hebdomadaire : tous les 7 jours', () => {
    const dates = getDatesInRange(
      rec({ frequency: 'weekly', startDate: '2026-06-01' }),
      new Date(2026, 5, 1), new Date(2026, 5, 22), // 1 → 21 juin
    )
    expect(dates.map(d => d.slice(0, 10))).toEqual(['2026-06-01', '2026-06-08', '2026-06-15'])
  })

  it('trimestriel : tous les 3 mois alignés sur startDate', () => {
    const dates = getDatesInRange(
      rec({ frequency: 'quarterly', startDate: '2026-01-10', dayOfMonth: 10 }),
      new Date(2026, 0, 1), new Date(2026, 11, 1),
    )
    expect(dates.map(d => d.slice(0, 10))).toEqual(['2026-01-10', '2026-04-10', '2026-07-10', '2026-10-10'])
  })

  it('annuel : une fois par an', () => {
    const dates = getDatesInRange(
      rec({ frequency: 'yearly', startDate: '2026-03-15' }),
      new Date(2026, 0, 1), new Date(2028, 0, 1),
    )
    expect(dates.map(d => d.slice(0, 10))).toEqual(['2026-03-15', '2027-03-15'])
  })
})
