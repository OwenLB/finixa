// @vitest-environment nuxt
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { h, nextTick } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppDrawer from './AppDrawer.vue'

// AppDrawer = dialog accessible (Teleport vers <body>, composables Nuxt, piège à
// focus). On vérifie les garanties d'accessibilité indépendantes du rendu (le
// DOM de test n'a pas de layout : offsetParent est nul, donc on ne teste pas le
// cyclage Tab visuel mais bien Escape, le verrou de scroll et le focus).

let wrapper: VueWrapper | null = null

beforeEach(() => setActivePinia(createPinia()))
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.style.overflow = ''
})

async function openDrawer(): Promise<VueWrapper> {
  // Le watch d'ouverture n'est pas `immediate` : on monte fermé puis on ouvre
  // pour déclencher focus + verrou + écouteur clavier.
  wrapper = await mountSuspended(AppDrawer, {
    props: { modelValue: false, title: 'Titre' },
    slots: { default: () => h('button', { class: 'inside-btn' }, 'OK') },
    global: { mocks: { $t: (k: string) => k } },
  })
  await wrapper.setProps({ modelValue: true })
  await nextTick() // le focus est posé dans un nextTick interne
  return wrapper
}

describe('AppDrawer (runtime Nuxt)', () => {
  it('se ferme sur Escape (émet update:modelValue=false)', async () => {
    const w = await openDrawer()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })

  it('verrouille le scroll du body à l’ouverture et le restaure à la fermeture', async () => {
    const w = await openDrawer()
    expect(document.body.style.overflow).toBe('hidden')

    await w.setProps({ modelValue: false })
    expect(document.body.style.overflow).toBe('')
  })

  it('déplace le focus dans le drawer à l’ouverture', async () => {
    await openDrawer()
    const drawer = document.querySelector('.drawer')
    expect(drawer).not.toBeNull()
    const active = document.activeElement
    expect(drawer === active || drawer!.contains(active)).toBe(true)
  })

  it('restitue le focus à l’élément précédent à la fermeture', async () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()

    const w = await openDrawer()
    await w.setProps({ modelValue: false })

    expect(document.activeElement).toBe(outside)
    outside.remove()
  })
})
