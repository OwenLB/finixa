import { describe, it, expect } from 'vitest'
import { buildVirtualTransactions } from './virtualTransactions'
import type { RecurringExpense, Transaction } from '~/types'

function rec(p: Partial<RecurringExpense>): RecurringExpense {
  return {
    id: 'r', name: 'Loyer', amount: -1000, type: 'depense', category: 'cat', categorized: true,
    frequency: 'monthly', dayOfMonth: 5, startDate: '2026-01-05', endDate: null,
    accountingOffset: 'same_month', ...p,
  }
}

function tx(p: Partial<Transaction>): Transaction {
  return {
    id: 'x', name: 'n', category: '', categorized: false, amount: 0,
    date: '2026-06-05T12:00:00', type: 'depense', status: 'pending', horsBudget: false, ...p,
  }
}

const JUNE = { start: '2026-06-01', end: '2026-07-01' }

describe('buildVirtualTransactions', () => {
  it('génère une occurrence virtuelle non couverte', () => {
    const v = buildVirtualTransactions([], [rec({})], JUNE)
    expect(v.length).toBe(1)
    expect(v[0]!.virtual).toBe(true)
    expect(v[0]!.date.slice(0, 10)).toBe('2026-06-05')
    expect(v[0]!.recurrenceOccurrence).toBe('2026-06')
  })

  it('ne génère pas si une transaction réelle couvre l\'occurrence (par clé)', () => {
    const real = [tx({ recurringId: 'r', recurrenceOccurrence: '2026-06' })]
    const v = buildVirtualTransactions(real, [rec({ id: 'r' })], JUNE)
    expect(v.length).toBe(0)
  })

  it('déduplique par date pour les anciennes transactions sans clé d\'occurrence', () => {
    // recurrenceOccurrence absent → fallback sur (recurringId, date)
    const real = [tx({ recurringId: 'r', date: '2026-06-05T12:00:00' })]
    const v = buildVirtualTransactions(real, [rec({ id: 'r' })], JUNE)
    expect(v.length).toBe(0)
  })

  it('reporte les champs de la récurrence sur l\'occurrence virtuelle', () => {
    const v = buildVirtualTransactions([], [rec({ amount: -1000, type: 'depense' })], JUNE)
    const o = v[0]!
    expect(o.amount).toBe(-1000)
    expect(o.type).toBe('depense')
    expect(o.status).toBe('pending')
    expect(o.horsBudget).toBe(false)
    expect(o.id).toBe('virtual-r-2026-06')
  })

  it('génère une occurrence par récurrence distincte', () => {
    const v = buildVirtualTransactions([], [rec({ id: 'a' }), rec({ id: 'b' })], JUNE)
    expect(v.length).toBe(2)
    expect(new Set(v.map(o => o.recurringId))).toEqual(new Set(['a', 'b']))
  })

  it('hebdomadaire : plusieurs occurrences dans le mois', () => {
    // 1er juin → 1, 8, 15, 22, 29 = 5 occurrences en juin 2026
    const v = buildVirtualTransactions([], [rec({ frequency: 'weekly', startDate: '2026-06-01' })], JUNE)
    expect(v.length).toBe(5)
    expect(v.every(o => o.virtual)).toBe(true)
  })

  it('aucune occurrence hors période (annuel ancré en mars)', () => {
    const v = buildVirtualTransactions([], [rec({ frequency: 'yearly', startDate: '2026-03-20' })], JUNE)
    expect(v.length).toBe(0)
  })

  it('décalage comptable next_month : occurrence du mois précédent, datée comptablement sur le mois courant', () => {
    const v = buildVirtualTransactions([], [rec({ accountingOffset: 'next_month' })], JUNE)
    expect(v.length).toBe(1)
    expect(v[0]!.date.slice(0, 10)).toBe('2026-05-05')      // occurrence réelle en mai
    expect(v[0]!.accountingDate).toBe('2026-06-01')          // comptabilisée en juin
    expect(v[0]!.recurrenceOccurrence).toBe('2026-05')
  })
})
