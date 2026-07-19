// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StepLayout from './StepLayout.vue'

describe('OnboardingStepLayout', () => {
  it('rend le titre et le sous-titre', () => {
    const w = mount(StepLayout, { props: { title: 'Titre', subtitle: 'Sous-titre' } })
    expect(w.find('.ostep__title').text()).toBe('Titre')
    expect(w.find('.ostep__sub').text()).toBe('Sous-titre')
  })

  it('rend le contenu par défaut et la zone actions', () => {
    const w = mount(StepLayout, {
      slots: { default: '<p class="x">corps</p>', actions: '<button>go</button>' },
    })
    expect(w.find('.ostep__body .x').text()).toBe('corps')
    expect(w.find('.ostep__actions').exists()).toBe(true)
    expect(w.find('.ostep__actions button').text()).toBe('go')
  })

  it('masque la zone actions quand le slot est absent', () => {
    const w = mount(StepLayout, { props: { title: 'T' } })
    expect(w.find('.ostep__actions').exists()).toBe(false)
  })

  it('applique la variante center', () => {
    const w = mount(StepLayout, { props: { center: true } })
    expect(w.find('.ostep').classes()).toContain('ostep--center')
  })

  it("n'affiche pas l'en-tête sans titre ni sous-titre", () => {
    const w = mount(StepLayout, { slots: { default: 'x' } })
    expect(w.find('.ostep__head').exists()).toBe(false)
  })
})
