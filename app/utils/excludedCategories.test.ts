import { describe, it, expect } from 'vitest'
import { buildExcludedMatcher } from './excludedCategories'
import type { ManagedCategory } from '~/types'

function cat(partial: Partial<ManagedCategory> & Pick<ManagedCategory, 'id' | 'name' | 'type'>): ManagedCategory {
  return {
    iconKey: 'x', color: '#000', isVariable: false, excluded: false, totalBudget: 0,
    subcategories: [], ...partial,
  }
}

describe('buildExcludedMatcher', () => {
  it('retourne toujours false si aucune catégorie exclue', () => {
    const match = buildExcludedMatcher([
      cat({ id: 'c1', name: 'Salaire', type: 'revenu' }),
    ])
    expect(match({ category: 'Salaire', type: 'revenu' })).toBe(false)
  })

  it('apparie une transaction non catégorisée par (type, nom)', () => {
    const match = buildExcludedMatcher([
      cat({ id: 'c1', name: 'Virement épargne', type: 'revenu', excluded: true }),
    ])
    expect(match({ category: 'Virement épargne', type: 'revenu' })).toBe(true)
    // même nom mais autre type → pas exclu
    expect(match({ category: 'Virement épargne', type: 'depense' })).toBe(false)
    // autre catégorie revenu → pas exclu
    expect(match({ category: 'Salaire', type: 'revenu' })).toBe(false)
  })

  it('apparie une transaction catégorisée par UUID de sous-catégorie', () => {
    const match = buildExcludedMatcher([
      cat({
        id: 'c1', name: 'Désépargne', type: 'revenu', excluded: true,
        subcategories: [
          { id: 'sub-livret-a', name: 'Livret A', budget: null, envelope: null, excluded: false },
        ],
      }),
      cat({ id: 'c2', name: 'Salaire', type: 'revenu' }),
    ])
    expect(match({ category: 'sub-livret-a', type: 'revenu' })).toBe(true)
    expect(match({ category: 'autre-sub',    type: 'revenu' })).toBe(false)
  })

  it('exclut une sous-catégorie marquée même si sa catégorie ne l\'est pas', () => {
    const match = buildExcludedMatcher([
      cat({
        id: 'c1', name: 'Épargne', type: 'epargne', excluded: false,
        subcategories: [
          { id: 'sub-livret', name: 'Livret A',  budget: null, envelope: null, excluded: true },
          { id: 'sub-pel',    name: 'PEL',        budget: null, envelope: null, excluded: false },
        ],
      }),
    ])
    expect(match({ category: 'sub-livret', type: 'epargne' })).toBe(true)
    expect(match({ category: 'sub-pel',    type: 'epargne' })).toBe(false)
  })
})
