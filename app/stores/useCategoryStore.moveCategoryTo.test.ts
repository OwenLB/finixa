// Tests the moveCategoryTo reindexing algorithm from useCategoryStore.
// We test the pure array logic directly (no store instantiation) to avoid
// the Supabase plugin dependency chain in the nuxt test environment.
// The algorithm: splice `from` out of the same-type group, insert at `to`,
// then write the group back into the flat categories array in-place.
import { describe, it, expect } from 'vitest'
import type { ManagedCategory } from '~/types'

function makeCat(id: string, type: ManagedCategory['type']): ManagedCategory {
  return {
    id,
    name:          id,
    type,
    iconKey:       'circle',
    color:         '#888',
    isVariable:    false,
    excluded:      false,
    totalBudget:   0,
    subcategories: [],
  }
}

// Mirror of moveCategoryTo logic in useCategoryStore.ts (keep in sync).
function moveCategoryTo(
  categories: ManagedCategory[],
  id: string,
  from: number,
  to: number,
): ManagedCategory[] {
  const cat = categories.find(c => c.id === id)
  if (!cat || from === to) return [...categories]
  const group = categories.filter(c => c.type === cat.type)
  if (from < 0 || from >= group.length || to < 0 || to >= group.length) return [...categories]
  const [item] = group.splice(from, 1)
  group.splice(to, 0, item!)
  const result = [...categories]
  let gi = 0
  for (let i = 0; i < result.length; i++) {
    if (result[i]!.type === cat.type) result[i] = group[gi++]!
  }
  return result
}

describe('useCategoryStore — moveCategoryTo', () => {
  it("déplace une catégorie vers l'avant dans son groupe de type", () => {
    const cats = [makeCat('d1', 'depense'), makeCat('d2', 'depense'), makeCat('d3', 'depense')]
    const result = moveCategoryTo(cats, 'd1', 0, 2)
    expect(result.filter(c => c.type === 'depense').map(c => c.id)).toEqual(['d2', 'd3', 'd1'])
  })

  it("déplace une catégorie vers l'arrière", () => {
    const cats = [makeCat('d1', 'depense'), makeCat('d2', 'depense'), makeCat('d3', 'depense')]
    const result = moveCategoryTo(cats, 'd3', 2, 0)
    expect(result.filter(c => c.type === 'depense').map(c => c.id)).toEqual(['d3', 'd1', 'd2'])
  })

  it('ne fait rien si from === to', () => {
    const cats = [makeCat('d1', 'depense'), makeCat('d2', 'depense')]
    const result = moveCategoryTo(cats, 'd1', 0, 0)
    expect(result.map(c => c.id)).toEqual(['d1', 'd2'])
  })

  it('ne touche pas aux catégories des autres types', () => {
    const cats = [
      makeCat('r1', 'revenu'),
      makeCat('d1', 'depense'),
      makeCat('d2', 'depense'),
      makeCat('e1', 'epargne'),
    ]
    const result = moveCategoryTo(cats, 'd1', 0, 1)
    expect(result.find(c => c.id === 'r1')).toBeDefined()
    expect(result.find(c => c.id === 'e1')).toBeDefined()
    expect(result.filter(c => c.type === 'depense').map(c => c.id)).toEqual(['d2', 'd1'])
  })

  it("ne modifie pas le tableau si l'id est inconnu", () => {
    const cats = [makeCat('d1', 'depense'), makeCat('d2', 'depense')]
    const result = moveCategoryTo(cats, 'nonexistent', 0, 1)
    expect(result.map(c => c.id)).toEqual(['d1', 'd2'])
  })
})
