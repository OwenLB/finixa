import { describe, it, expect } from 'vitest'
import { mapTransactionRow } from './transactionService'

describe('mapTransactionRow', () => {
  it('mappe une ligne DB (snake_case) vers Transaction (camelCase)', () => {
    const row = {
      id: 't1', name: 'Loyer', note: null, category: 'sub-1', categorized: true,
      amount: -1000, date: '2026-06-01T12:00:00', accounting_date: '2026-06-01',
      type: 'depense', recurring_id: 'r1', recurrence_occurrence: '2026-06',
      status: 'checked', hors_budget: false,
    }
    expect(mapTransactionRow(row)).toEqual({
      id: 't1', name: 'Loyer', note: null, category: 'sub-1', categorized: true,
      amount: -1000, date: '2026-06-01T12:00:00', accountingDate: '2026-06-01',
      type: 'depense', recurringId: 'r1', recurrenceOccurrence: '2026-06',
      status: 'checked', horsBudget: false,
    })
  })

  it('applique les valeurs par défaut (hors_budget absent → false, note/accounting_date → null)', () => {
    const tx = mapTransactionRow({
      id: 't2', name: 'X', category: '', categorized: false, amount: 5,
      date: '2026-06-02T12:00:00', type: 'revenu', status: 'pending',
    })
    expect(tx.horsBudget).toBe(false)
    expect(tx.note).toBeNull()
    expect(tx.accountingDate).toBeNull()
  })
})
