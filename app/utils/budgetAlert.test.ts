import { describe, it, expect } from 'vitest'
import { variableBudgetAlert } from './budgetAlert'

describe('variableBudgetAlert', () => {
  it('null si budget ou dépense ≤ 0', () => {
    expect(variableBudgetAlert(0, 300, 0.5)).toBeNull()
    expect(variableBudgetAlert(50, 0, 0.5)).toBeNull()
  })

  it('red dès qu\'il y a dépassement du budget', () => {
    expect(variableBudgetAlert(320, 300, 0.5)).toBe('red')
  })

  it('null en période future (progressRatio = 0) sans dépassement réel', () => {
    expect(variableBudgetAlert(50, 300, 0)).toBeNull()
  })

  it('green si le rythme de dépense suit le temps écoulé (≤ +15%)', () => {
    // 50% du temps écoulé, 50% du budget dépensé
    expect(variableBudgetAlert(150, 300, 0.5)).toBe('green')
  })

  it('orange si légèrement en avance (entre +15% et +30%)', () => {
    // 30% du temps, 55% dépensé → 0.55 ≤ 0.30+0.30
    expect(variableBudgetAlert(165, 300, 0.30)).toBe('orange')
  })

  it('red si nettement en avance sur la trajectoire (> +30%)', () => {
    // 20% du temps, 60% dépensé
    expect(variableBudgetAlert(180, 300, 0.20)).toBe('red')
  })
})
