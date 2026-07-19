// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RecurringScopeSheet from './RecurringScopeSheet.vue'

// AppDrawer (auto-import Nuxt) et $t ne sont pas disponibles hors runtime Nuxt :
// on stubbe le drawer (en rendant son slot) et on mocke $t.
const mountOptions = {
  props: { modelValue: true },
  global: {
    mocks: { $t: (k: string) => k },
    stubs: { AppDrawer: { template: '<div><slot /></div>' } },
  },
}

describe('RecurringScopeSheet', () => {
  it('émet choose=occurrence puis choose=future au clic (B-M1)', async () => {
    const w = mount(RecurringScopeSheet, mountOptions)
    const options = w.findAll('.scope-sheet__option')
    expect(options).toHaveLength(2)

    await options[0]!.trigger('click')
    await options[1]!.trigger('click')

    expect(w.emitted('choose')).toEqual([['occurrence'], ['future']])
  })
})
