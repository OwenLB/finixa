import { describe, it, expect } from 'vitest'
import { toKey, addMonths, prevMonthKey, getPeriodBounds } from './period'

describe('period', () => {
  it('toKey / addMonths gèrent les bascules d\'année', () => {
    expect(toKey(new Date(2026, 0, 5))).toBe('2026-01')
    expect(addMonths('2026-01', 1)).toBe('2026-02')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })

  it('prevMonthKey recule d\'un mois', () => {
    expect(prevMonthKey('2026-03')).toBe('2026-02')
    expect(prevMonthKey('2026-01')).toBe('2025-12')
  })

  it('getPeriodBounds — période calendaire (startDay <= 1)', () => {
    expect(getPeriodBounds(1, '2026-04')).toEqual({ start: '2026-04-01', end: '2026-05-01' })
    expect(getPeriodBounds(1, '2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' })
  })

  it('getPeriodBounds — période personnalisée (startDay = 25)', () => {
    expect(getPeriodBounds(25, '2026-04')).toEqual({ start: '2026-04-25', end: '2026-05-25' })
  })

  it('getPeriodBounds — clamp sur les mois courts (startDay = 31, février, B-m2)', () => {
    // février 2026 a 28 jours → start clampé au 28 ; mars a 31 jours → end au 31
    expect(getPeriodBounds(31, '2026-02')).toEqual({ start: '2026-02-28', end: '2026-03-31' })
  })
})
