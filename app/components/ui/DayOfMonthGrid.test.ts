// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DayOfMonthGrid from './DayOfMonthGrid.vue'

describe('DayOfMonthGrid', () => {
  it('rend `max` jours (défaut 31)', () => {
    expect(mount(DayOfMonthGrid, { props: { modelValue: 1 } }).findAll('.day-grid__day')).toHaveLength(31)
    expect(mount(DayOfMonthGrid, { props: { modelValue: 1, max: 28 } }).findAll('.day-grid__day')).toHaveLength(28)
  })

  it('marque le jour sélectionné', () => {
    const w = mount(DayOfMonthGrid, { props: { modelValue: 5 } })
    const days = w.findAll('.day-grid__day')
    expect(days[4]!.classes()).toContain('day-grid__day--selected')
    expect(days[0]!.classes()).not.toContain('day-grid__day--selected')
  })

  it('émet le jour cliqué', async () => {
    const w = mount(DayOfMonthGrid, { props: { modelValue: 1 } })
    await w.findAll('.day-grid__day')[14]!.trigger('click')
    expect(w.emitted('update:modelValue')![0]).toEqual([15])
  })

  it('grise les jours courts (>= 29)', () => {
    const w = mount(DayOfMonthGrid, { props: { modelValue: 1 } })
    const days = w.findAll('.day-grid__day')
    expect(days[28]!.classes()).toContain('day-grid__day--short') // 29
    expect(days[27]!.classes()).not.toContain('day-grid__day--short') // 28
  })
})
