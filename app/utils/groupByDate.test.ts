import { describe, it, expect } from 'vitest'
import { groupByDate, type GroupByDateLabels } from './groupByDate'
import type { Transaction } from '~/types'

const labels: GroupByDateLabels = { today: "Aujourd'hui", yesterday: 'Hier', locale: 'fr-FR' }

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: 'x', name: 'n', category: '', categorized: false, amount: 0,
    date: '2026-06-10T12:00:00', type: 'depense', status: 'pending', horsBudget: false,
    ...partial,
  }
}

describe('groupByDate', () => {
  it('groupe par jour et somme les montants du groupe', () => {
    const groups = groupByDate([
      tx({ id: 'a', date: '2026-06-10T08:00:00', amount: -10 }),
      tx({ id: 'b', date: '2026-06-10T20:00:00', amount: -5 }),
      tx({ id: 'c', date: '2026-06-09T08:00:00', amount: -3 }),
    ], labels)
    expect(groups.length).toBe(2)
    const g10 = groups.find(g => g.dateKey === '2026-06-10')!
    expect(g10.transactions.length).toBe(2)
    expect(g10.total).toBe(-15)
  })

  it('trie les groupes par date décroissante', () => {
    const groups = groupByDate([
      tx({ date: '2026-06-09T08:00:00' }),
      tx({ date: '2026-06-11T08:00:00' }),
      tx({ date: '2026-06-10T08:00:00' }),
    ], labels)
    expect(groups.map(g => g.dateKey)).toEqual(['2026-06-11', '2026-06-10', '2026-06-09'])
  })

  it('utilise accountingDate en priorité sur la date réelle', () => {
    const groups = groupByDate([
      tx({ date: '2026-06-30T08:00:00', accountingDate: '2026-07-01' }),
    ], labels)
    expect(groups[0]!.dateKey).toBe('2026-07-01')
  })
})
