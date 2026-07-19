import { describe, it, expect } from 'vitest'
import { buildCategoryFilter } from './transactionFilter'
import type { ManagedCategory } from '~/types'

function cat(partial: Partial<ManagedCategory> & Pick<ManagedCategory, 'id' | 'name' | 'type' | 'subcategories'>): ManagedCategory {
  return { iconKey: 'x', color: '#000', isVariable: false, excluded: false, totalBudget: 0, ...partial }
}

const categories: ManagedCategory[] = [
  cat({
    id: 'c-courses', name: 'Courses', type: 'depense',
    subcategories: [
      { id: 'sub-super', name: 'Supermarché', budget: null, envelope: null, excluded: false },
      { id: 'sub-resto', name: 'Restaurant',  budget: null, envelope: null, excluded: false },
    ],
  }),
  cat({ id: 'c-salaire', name: 'Salaire', type: 'revenu', subcategories: [] }),
]

// tx.category = UUID de sous-catégorie quand catégorisée
const txSuper = { category: 'sub-super' }
const txResto = { category: 'sub-resto' }
const txSalaire = { category: 'Salaire' } // non catégorisée → nom de catégorie

describe('buildCategoryFilter', () => {
  it('sans sélection → tout passe', () => {
    const m = buildCategoryFilter(categories, [], [])
    expect(m(txSuper)).toBe(true)
    expect(m(txSalaire)).toBe(true)
  })

  it('catégorie seule → toutes ses sous-catégories', () => {
    const m = buildCategoryFilter(categories, ['Courses'], [])
    expect(m(txSuper)).toBe(true)
    expect(m(txResto)).toBe(true)
    expect(m(txSalaire)).toBe(false)
  })

  it('catégorie + sous-catégorie → RESTREINT à la sous-catégorie (régression)', () => {
    // Avant le fix, la catégorie « écrasait » la sous-catégorie et tout passait.
    const m = buildCategoryFilter(categories, ['Courses'], ['Supermarché'])
    expect(m(txSuper)).toBe(true)
    expect(m(txResto)).toBe(false)   // l'autre sous-catégorie est exclue
    expect(m(txSalaire)).toBe(false)
  })

  it('sous-catégorie seule (navigation depuis le détail) → uniquement elle', () => {
    const m = buildCategoryFilter(categories, [], ['Restaurant'])
    expect(m(txResto)).toBe(true)
    expect(m(txSuper)).toBe(false)
  })

  it('combine catégorie large + sous-catégorie d\'une autre catégorie', () => {
    const m = buildCategoryFilter(categories, ['Salaire', 'Courses'], ['Restaurant'])
    // Salaire : large → passe ; Courses : restreinte à Restaurant
    expect(m(txSalaire)).toBe(true)
    expect(m(txResto)).toBe(true)
    expect(m(txSuper)).toBe(false)
  })
})
