import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useHaptics } from './useHaptics'

describe('useHaptics', () => {
  beforeEach(() => {
    // navigator n'existe pas en environnement node — on le crée via stubGlobal
    vi.stubGlobal('navigator', { vibrate: vi.fn() })
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('calls vibrate with 10ms for light impact', () => {
    const { impact } = useHaptics()
    impact('light')
    expect(navigator.vibrate).toHaveBeenCalledWith(10)
  })

  it('calls vibrate with 20ms for medium impact', () => {
    const { impact } = useHaptics()
    impact('medium')
    expect(navigator.vibrate).toHaveBeenCalledWith(20)
  })

  it('calls vibrate with 40ms for heavy impact', () => {
    const { impact } = useHaptics()
    impact('heavy')
    expect(navigator.vibrate).toHaveBeenCalledWith(40)
  })

  it('calls vibrate with 8ms for selection', () => {
    const { selection } = useHaptics()
    selection()
    expect(navigator.vibrate).toHaveBeenCalledWith(8)
  })

  it('calls vibrate with success pattern', () => {
    const { notification } = useHaptics()
    notification('success')
    expect(navigator.vibrate).toHaveBeenCalledWith([10, 30, 10])
  })

  it('does not throw when navigator.vibrate is undefined', () => {
    vi.stubGlobal('navigator', { vibrate: undefined })
    const { impact } = useHaptics()
    expect(() => impact('light')).not.toThrow()
  })
})
