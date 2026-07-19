// @vitest-environment nuxt
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AmountInput from './AmountInput.vue'

// AmountInput lit `useCurrencyStore()` au setup : il faut un Pinia actif.
beforeEach(() => setActivePinia(createPinia()))

// AmountInput dépend du runtime Nuxt (auto-imports `ref`/`computed`/`watch` et
// `useCurrencyStore`) : on le monte donc dans l'environnement `nuxt`.
// Cœur testé : l'accumulation des centimes (chaque chiffre = cents*10 + d).

// `$t` (global i18n du template) n'est pas injecté par mountSuspended : on le
// mocke comme identité (on ne teste pas les traductions ici, mais la logique).
function mount(modelValue: number) {
  return mountSuspended(AmountInput, {
    props: { modelValue },
    global: { mocks: { $t: (k: string) => k } },
  })
}

async function typeDigits(w: VueWrapper, keys: string[]): Promise<void> {
  const input = w.find('.amount-input__capture')
  for (const key of keys) await input.trigger('keydown', { key })
}

function lastEmittedAmount(w: VueWrapper): number {
  const emits = w.emitted('update:modelValue') as unknown[][] | undefined
  expect(emits, 'aucun update:modelValue émis').toBeTruthy()
  return (emits!.at(-1) as number[])[0]
}

describe('AmountInput (runtime Nuxt)', () => {
  it('accumule les chiffres saisis en centimes (1·2·3·4 → 12,34 €)', async () => {
    const w = await mount(0)
    await typeDigits(w, ['1', '2', '3', '4'])

    expect(lastEmittedAmount(w)).toBeCloseTo(12.34, 2)
    expect(w.find('.amount-input__number').text()).toContain('12')
    expect(w.find('.amount-input__decimal').text()).toContain('34')
  })

  it('Backspace retire le dernier chiffre saisi', async () => {
    const w = await mount(0)
    await typeDigits(w, ['1', '2', '3']) // 1,23 €
    await w.find('.amount-input__capture').trigger('keydown', { key: 'Backspace' })

    expect(lastEmittedAmount(w)).toBeCloseTo(0.12, 2)
  })

  it('pré-remplit l’affichage depuis modelValue', async () => {
    const w = await mount(7.5)

    expect(w.find('.amount-input__number').text()).toContain('7')
    expect(w.find('.amount-input__decimal').text()).toContain('50')
  })

  it('plafonne le montant (~999 999,99 €) et n’émet plus au-delà', async () => {
    const w = await mount(0)
    await typeDigits(w, Array(10).fill('9')) // bien au-delà du plafond

    expect(lastEmittedAmount(w)).toBeCloseTo(99999.99, 2)
  })
})
