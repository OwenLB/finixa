// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppButton from './AppButton.vue'

describe('AppButton', () => {
  it('désactive le bouton et pose aria-busy quand loading (anti double-submit, B-M6)', () => {
    const w = mount(AppButton, { props: { loading: true }, slots: { default: 'OK' } })
    const btn = w.find('button')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.attributes('aria-busy')).toBe('true')
  })

  it('désactive le bouton quand disabled', () => {
    const w = mount(AppButton, { props: { disabled: true } })
    expect(w.find('button').attributes('disabled')).toBeDefined()
  })

  it('actif et cliquable par défaut', () => {
    const w = mount(AppButton, { slots: { default: 'Go' } })
    const btn = w.find('button')
    expect(btn.attributes('disabled')).toBeUndefined()
    expect(btn.attributes('aria-busy')).toBeUndefined()
    expect(btn.text()).toBe('Go')
  })
})
