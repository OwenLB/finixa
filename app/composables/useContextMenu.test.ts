import { describe, it, expect, beforeEach } from 'vitest'
import { useContextMenu } from './useContextMenu'

// useContextMenu expose un singleton réactif module-level.
// On teste que show/hide basculent l'état correctement.

describe('useContextMenu', () => {
  // Réinitialise l'état partagé entre les tests
  beforeEach(() => {
    const { hide } = useContextMenu()
    hide()
  })

  it('est invisible par défaut', () => {
    const { state } = useContextMenu()
    expect(state.visible).toBe(false)
  })

  it('show() rend le menu visible avec les items et la position', () => {
    const { show, state } = useContextMenu()
    const items = [{ label: 'A', icon: {}, action: () => {} }]
    show(items, 300)
    expect(state.visible).toBe(true)
    expect(state.items).toHaveLength(1)
    expect(state.items[0]!.label).toBe('A')
    expect(state.anchorY).toBe(300)
  })

  it('hide() cache le menu', () => {
    const { show, hide, state } = useContextMenu()
    show([{ label: 'X', icon: {}, action: () => {} }], 100)
    hide()
    expect(state.visible).toBe(false)
  })

  it('show() remplace les items précédents', () => {
    const { show, state } = useContextMenu()
    show([{ label: 'A', icon: {}, action: () => {} }], 100)
    show([{ label: 'B', icon: {}, action: () => {} }, { label: 'C', icon: {}, action: () => {} }], 200)
    expect(state.items).toHaveLength(2)
    expect(state.items[0]!.label).toBe('B')
    expect(state.anchorY).toBe(200)
  })

  it('deux instances partagent le même état (singleton)', () => {
    const a = useContextMenu()
    const b = useContextMenu()
    a.show([{ label: 'Z', icon: {}, action: () => {} }], 50)
    expect(b.state.visible).toBe(true)
    expect(b.state.items[0]!.label).toBe('Z')
  })
})
