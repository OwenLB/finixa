import { describe, it, expect } from 'vitest'
import { budgetForMonth } from './budgetForMonth'

describe('budgetForMonth', () => {
  const versions = [
    { effective_from: '2026-03', budget: 100 },
    { effective_from: '2026-06', budget: 200 },
  ]

  it('prend la version effective la plus récente <= mois', () => {
    expect(budgetForMonth(versions, '2026-06')).toBe(200)
    expect(budgetForMonth(versions, '2026-07')).toBe(200)
    expect(budgetForMonth(versions, '2026-04')).toBe(100)
    expect(budgetForMonth(versions, '2026-03')).toBe(100)
  })

  it('renvoie null si le mois précède toute version', () => {
    expect(budgetForMonth(versions, '2026-02')).toBeNull()
  })

  it('renvoie null sans aucune version', () => {
    expect(budgetForMonth([], '2026-06')).toBeNull()
  })

  it('préserve un budget null explicite (suivi sans budget)', () => {
    expect(budgetForMonth([{ effective_from: '2026-01', budget: null }], '2026-05')).toBeNull()
  })

  it('ordre des versions indifférent', () => {
    const shuffled = [
      { effective_from: '2026-06', budget: 200 },
      { effective_from: '2026-01', budget: 50 },
      { effective_from: '2026-03', budget: 100 },
    ]
    expect(budgetForMonth(shuffled, '2026-05')).toBe(100)
  })
})
