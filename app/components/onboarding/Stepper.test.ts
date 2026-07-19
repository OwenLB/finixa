// @vitest-environment nuxt
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Stepper from './Stepper.vue'

beforeEach(() => setActivePinia(createPinia()))

function mount(step: number, showBack = false) {
  return mountSuspended(Stepper, {
    props: { step, showBack },
    global: { mocks: { $t: (k: string) => k } },
  })
}

describe('OnboardingStepper (runtime Nuxt)', () => {
  it('marque les étapes franchies (done) et l’étape courante (active)', async () => {
    const w = await mount(3)
    expect(w.findAll('.stepper__step--done')).toHaveLength(2)
    expect(w.findAll('.stepper__step--active')).toHaveLength(1)
  })

  it('remplit le rail proportionnellement (0 % au 1er, 100 % au dernier)', async () => {
    const first = await mount(1)
    expect(first.find('.stepper__rail-fill').attributes('style')).toContain('75% * 0)')

    const last = await mount(4)
    expect(last.find('.stepper__rail-fill').attributes('style')).toContain('75% * 1)')
  })

  it('affiche le bouton retour uniquement quand showBack est vrai', async () => {
    expect((await mount(2, false)).find('.stepper__back').exists()).toBe(false)
    expect((await mount(2, true)).find('.stepper__back').exists()).toBe(true)
  })
})
