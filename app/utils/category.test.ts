import { describe, it, expect } from 'vitest'
import { resolveCategory, resolveCategoryLabel } from './category'
import type { ManagedCategory } from '~/types'

const cats: ManagedCategory[] = [
  {
    id: 'cat-1', name: 'Alimentation', type: 'depense', iconKey: 'cart', color: '#fff',
    isVariable: true, excluded: false, totalBudget: 300,
    subcategories: [{ id: 'sub-1', name: 'Courses', budget: 300, envelope: 'needs', excluded: false }],
  },
  {
    id: 'cat-2', name: 'Revenus', type: 'revenu', iconKey: 'wallet', color: '#fff',
    isVariable: false, excluded: false, totalBudget: 0,
    subcategories: [{ id: 'sub-2', name: 'Salaire', budget: 0, envelope: null, excluded: false }],
  },
]

describe('resolveCategory', () => {
  it('résout par UUID de sous-catégorie', () => {
    expect(resolveCategory('sub-1', 'depense', cats)).toEqual({
      category: 'Alimentation', categoryId: 'cat-1', subcategory: 'Courses', subcategoryId: 'sub-1',
    })
  })

  it('résout par nom (données legacy)', () => {
    expect(resolveCategory('Courses', 'depense', cats)).toEqual({
      category: 'Alimentation', categoryId: 'cat-1', subcategory: 'Courses', subcategoryId: 'sub-1',
    })
  })

  it('résout un UUID de catégorie parente sans sous-catégorie', () => {
    expect(resolveCategory('cat-1', 'depense', cats)).toEqual({
      category: 'Alimentation', categoryId: 'cat-1', subcategory: '', subcategoryId: '',
    })
  })

  it('retombe sur la valeur brute si rien ne correspond', () => {
    expect(resolveCategory('inconnu', 'depense', cats)).toEqual({
      category: 'inconnu', categoryId: '', subcategory: '', subcategoryId: '',
    })
  })

  it('ne mélange pas les types (une sous-cat depense n\'est pas résolue en revenu)', () => {
    expect(resolveCategory('sub-1', 'revenu', cats).subcategoryId).toBe('')
  })
})

describe('resolveCategoryLabel', () => {
  it('renvoie le nom de la sous-catégorie depuis un UUID', () => {
    expect(resolveCategoryLabel('sub-1', cats)).toBe('Courses')
  })

  it('ne renvoie jamais d\'UUID brut (vide si non trouvé)', () => {
    expect(resolveCategoryLabel('xxxxx', cats)).toBe('')
  })
})
