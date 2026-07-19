// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppToggle from './AppToggle.vue'

// 1er test composant (Incrément 3). AppToggle n'utilise aucun auto-import Nuxt
// → montable directement. Cible le fix U19 (toggle focusable + émission).
describe('AppToggle', () => {
  it('reflète modelValue sur la case à cocher', () => {
    const wrapper = mount(AppToggle, { props: { modelValue: true } })
    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(true)
  })

  it('émet update:modelValue au changement', async () => {
    const wrapper = mount(AppToggle, { props: { modelValue: false } })
    await wrapper.find('input').setValue(true)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })
})
