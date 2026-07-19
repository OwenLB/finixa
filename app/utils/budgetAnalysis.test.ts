import { describe, it, expect } from 'vitest'
import { roundSuggestion, buildAnalysisRows } from './budgetAnalysis'
import type { ManagedCategory } from '~/types'

function cat(partial: Partial<ManagedCategory> & Pick<ManagedCategory, 'id' | 'name' | 'type' | 'subcategories'>): ManagedCategory {
  return { iconKey: 'x', color: '#000', isVariable: false, excluded: false, totalBudget: 0, ...partial }
}

describe('roundSuggestion', () => {
  it('renvoie 0 pour une valeur nulle ou négative', () => {
    expect(roundSuggestion(0)).toBe(0)
    expect(roundSuggestion(-12)).toBe(0)
  })
  it('arrondit à l\'unité sous 50', () => {
    expect(roundSuggestion(13.4)).toBe(13)
    expect(roundSuggestion(13.6)).toBe(14)
  })
  it('arrondit au pas de 5 entre 50 et 200', () => {
    expect(roundSuggestion(62)).toBe(60)
    expect(roundSuggestion(63)).toBe(65)
  })
  it('arrondit au pas de 10 au-delà de 200', () => {
    expect(roundSuggestion(234)).toBe(230)
    expect(roundSuggestion(236)).toBe(240)
  })
})

describe('buildAnalysisRows', () => {
  const categories: ManagedCategory[] = [
    cat({
      id: 'c-dep', name: 'Alimentation', type: 'depense',
      subcategories: [
        { id: 's-courses', name: 'Courses',     budget: 300, envelope: null, excluded: false },
        { id: 's-resto',   name: 'Restaurant',  budget: null, envelope: null, excluded: false },
        { id: 's-vide',    name: 'Inutilisée',  budget: null, envelope: null, excluded: false },
      ],
    }),
    cat({
      id: 'c-rev', name: 'Revenus', type: 'revenu',
      subcategories: [{ id: 's-salaire', name: 'Salaire', budget: 2000, envelope: null, excluded: false }],
    }),
  ]

  it('moyenne = total / nombre de mois actifs', () => {
    const totals = new Map([['s-courses', 1200]])  // 1200 / 6 = 200
    const rows = buildAnalysisRows(categories, totals, 6)
    const courses = rows.find(r => r.subId === 's-courses')!
    expect(courses.avgSpent).toBe(200)
    expect(courses.suggested).toBe(200)
    expect(courses.delta).toBe(-100)   // 200 - 300
  })

  it('ignore les catégories de type revenu', () => {
    const rows = buildAnalysisRows(categories, new Map([['s-salaire', 12000]]), 6)
    expect(rows.some(r => r.subId === 's-salaire')).toBe(false)
  })

  it('masque les sous-catégories sans budget ET sans dépense', () => {
    const rows = buildAnalysisRows(categories, new Map(), 6)
    expect(rows.some(r => r.subId === 's-vide')).toBe(false)
    expect(rows.some(r => r.subId === 's-resto')).toBe(false)  // budget null + 0 dépense
    expect(rows.some(r => r.subId === 's-courses')).toBe(true) // a un budget
  })

  it('inclut une sous-catégorie sans budget mais avec dépense', () => {
    const rows = buildAnalysisRows(categories, new Map([['s-resto', 600]]), 6)
    const resto = rows.find(r => r.subId === 's-resto')!
    expect(resto.avgSpent).toBe(100)
    expect(resto.currentBudget).toBeNull()
    expect(resto.delta).toBe(100)   // 100 - 0
  })

  it('trie par plus gros écart absolu d\'abord', () => {
    const totals = new Map([['s-courses', 1200], ['s-resto', 1800]]) // courses avg 200 (delta -100), resto avg 300 (delta +300)
    const rows = buildAnalysisRows(categories, totals, 6)
    expect(rows[0]!.subId).toBe('s-resto')
    expect(rows[1]!.subId).toBe('s-courses')
  })

  it('évite la division par zéro quand aucun mois actif (divisor = 1)', () => {
    const rows = buildAnalysisRows(categories, new Map([['s-courses', 250]]), 0)
    expect(rows.find(r => r.subId === 's-courses')!.avgSpent).toBe(250)
  })
})
