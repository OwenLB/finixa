import { describe, it, expect } from 'vitest'
import { isValidHex, deriveSubColors, darkenHex } from './colorUtils'

describe('colorUtils', () => {
  it('isValidHex valide uniquement les codes #RRGGBB', () => {
    expect(isValidHex('#ff0000')).toBe(true)
    expect(isValidHex('#ABCDEF')).toBe(true)
    expect(isValidHex('#fff')).toBe(false)    // trop court
    expect(isValidHex('ff0000')).toBe(false)  // pas de #
    expect(isValidHex('#gggggg')).toBe(false) // hors plage hex
  })

  it('deriveSubColors retourne `count` couleurs hex valides', () => {
    expect(deriveSubColors('#3b82f6', 0, true)).toEqual([])
    expect(deriveSubColors('#3b82f6', 1, true)).toHaveLength(1)
    const colors = deriveSubColors('#3b82f6', 5, true)
    expect(colors).toHaveLength(5)
    expect(colors.every(isValidHex)).toBe(true)
  })

  it('deriveSubColors — les dégradés dark et light diffèrent', () => {
    const dark  = deriveSubColors('#3b82f6', 4, true)
    const light = deriveSubColors('#3b82f6', 4, false)
    expect(dark).not.toEqual(light)
    expect(light.every(isValidHex)).toBe(true)
  })

  it('darkenHex assombrit la couleur et reste un hex valide', () => {
    const base = '#808080'
    const dark = darkenHex(base, 20)
    expect(isValidHex(dark)).toBe(true)
    expect(dark).not.toBe(base)
    const lum = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16)
    expect(lum(dark)).toBeLessThan(lum(base))
  })

  it('darkenHex borne la luminance à 0 (jamais sous le noir)', () => {
    expect(isValidHex(darkenHex('#050505', 50))).toBe(true)
  })
})
