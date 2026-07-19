import { describe, it, expect } from 'vitest'
import { computeDashboardSummary } from './dashboardSummary'
import type { Transaction } from '~/types'

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id:          partial.id ?? Math.random().toString(36).slice(2),
    name:        partial.name ?? 'tx',
    category:    partial.category ?? 'Autre',
    categorized: partial.categorized ?? false,
    amount:      partial.amount ?? 0,
    date:        partial.date ?? '2026-06-01T08:00:00',
    type:        partial.type ?? 'depense',
    status:      partial.status ?? 'pending',
    horsBudget:  partial.horsBudget ?? false,
    virtual:     partial.virtual,
    accountingDate: partial.accountingDate ?? null,
  }
}

describe('computeDashboardSummary', () => {
  it('exclut les transactions hors-budget des agrégats', () => {
    const s = computeDashboardSummary([
      tx({ type: 'depense', amount: -100, status: 'checked' }),
      tx({ type: 'depense', amount: -50, status: 'checked', horsBudget: true }),
    ])
    expect(s.spentReel).toBe(100)
    expect(s.spentPrev).toBe(100)
  })

  it('la gauge (spentReel) ne compte que les dépenses, pas l\'épargne', () => {
    // Régression : une épargne pointée gonflait spentReel et faisait passer la
    // jauge au rouge alors que le budget dépenses était respecté.
    const s = computeDashboardSummary([
      tx({ type: 'revenu',  amount: 2000, status: 'checked' }),
      tx({ type: 'depense', amount: -800, status: 'checked' }),
      tx({ type: 'epargne', amount: 500,  status: 'checked' }), // virement sortant épargne
    ])
    expect(s.ringIncome).toBe(2000)
    expect(s.spentReel).toBe(800)   // l'épargne (500) n'est PAS comptée
    expect(s.spentPrev).toBe(800)
    // progress = spentReel / ringIncome = 0,4 → pas de rouge
    expect(s.spentReel / s.ringIncome).toBeCloseTo(0.4)
  })

  it('spentReel ignore les transactions virtuelles et non pointées', () => {
    const s = computeDashboardSummary([
      tx({ type: 'depense', amount: -100, status: 'checked' }),
      tx({ type: 'depense', amount: -40,  status: 'pending' }),
      tx({ type: 'depense', amount: -30,  status: 'checked', virtual: true }),
    ])
    expect(s.spentReel).toBe(100)
    // prévisionnel = toutes les dépenses (réelles + virtuelles)
    expect(s.spentPrev).toBe(170)
  })

  it('calcule les soldes réel et prévisionnel à partir des montants signés', () => {
    const s = computeDashboardSummary([
      tx({ type: 'revenu',  amount: 1000, status: 'checked' }),
      tx({ type: 'depense', amount: -300, status: 'checked' }),
      tx({ type: 'depense', amount: -200, status: 'pending' }),
    ])
    expect(s.soldeReel).toBe(700)   // 1000 - 300 (pointés)
    expect(s.soldePrev).toBe(500)   // 1000 - 300 - 200 (tous)
  })

  it('agrège les montants absolus par type', () => {
    const s = computeDashboardSummary([
      tx({ type: 'depense', amount: -100 }),
      tx({ type: 'depense', amount: -50 }),
      tx({ type: 'revenu',  amount: 200 }),
      tx({ type: 'epargne', amount: 80 }),
    ])
    expect(s.spentByType.get('depense')).toBe(150)
    expect(s.spentByType.get('revenu')).toBe(200)
    expect(s.spentByType.get('epargne')).toBe(80)
  })

  describe('catégorie exclue (désépargne)', () => {
    // category 'desep' = désépargne (virement sortant du Livret), catégorisée 'revenu'
    const isExcluded = (tx: { category: string; type: string }) => tx.category === 'desep'

    it('la désépargne sort de la jauge (ringIncome) et est isolée', () => {
      const s = computeDashboardSummary([
        tx({ type: 'revenu',  amount: 2000, category: 'salaire', status: 'checked' }),
        tx({ type: 'revenu',  amount: 500,  category: 'desep',   status: 'checked' }),
        tx({ type: 'depense', amount: -2200, category: 'courses', status: 'checked' }),
      ], isExcluded)
      // ringIncome ne compte PAS la désépargne → 2000 (et pas 2500)
      expect(s.ringIncome).toBe(2000)
      expect(s.excludedByType.get('revenu')).toBe(500)
      // dépenses (2200) > revenus normaux (2000) → la jauge reste rouge
      expect(s.spentReel / s.ringIncome).toBeGreaterThan(1)
    })

    it('la désépargne compte dans le solde RÉEL mais pas dans le prévisionnel', () => {
      const s = computeDashboardSummary([
        tx({ type: 'revenu',  amount: 2000, category: 'salaire', status: 'checked' }),
        tx({ type: 'revenu',  amount: 500,  category: 'desep',   status: 'checked' }),
        tx({ type: 'depense', amount: -2200, category: 'courses', status: 'checked' }),
      ], isExcluded)
      // réel = 2000 + 500 - 2200 = 300 (désépargne incluse)
      expect(s.soldeReel).toBe(300)
      // prévisionnel = 2000 - 2200 = -200 (désépargne exclue)
      expect(s.soldePrev).toBe(-200)
    })
  })
})
