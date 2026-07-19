// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BudgetProgressBar from './BudgetProgressBar.vue'

// Couvre le 3e segment « extra » (désépargne, rouge) ajouté à la barre.
describe('BudgetProgressBar', () => {
  it('rend un segment extra quand extra > 0', () => {
    const w = mount(BudgetProgressBar, { props: { value: 50, max: 100, color: '#22c55e', extra: 40 } })
    expect(w.find('.bpb__extra').exists()).toBe(true)
  })

  it('pas de segment extra quand extra vaut 0 ou est absent', () => {
    const w = mount(BudgetProgressBar, { props: { value: 50, max: 100, color: '#22c55e' } })
    expect(w.find('.bpb__extra').exists()).toBe(false)
  })

  it('ignore le segment extra en mode reverse (vue « restant »)', () => {
    const w = mount(BudgetProgressBar, { props: { value: 50, max: 100, color: '#22c55e', extra: 40, reverse: true } })
    expect(w.find('.bpb__extra').exists()).toBe(false)
  })

  it('répartit les largeurs proportionnellement (fill + extra)', () => {
    // value 100 / max 100 / extra 100 → total 200 → fill 50 %, extra 50 %
    const w = mount(BudgetProgressBar, { props: { value: 100, max: 100, color: '#000', extra: 100 } })
    expect(w.find('.bpb__fill').attributes('style')).toContain('width: 50%')
    expect(w.find('.bpb__extra').attributes('style')).toContain('width: 50%')
  })
})
