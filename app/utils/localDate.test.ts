import { describe, it, expect } from 'vitest'
import { toLocalISO, addDaysISO, todayLocalISO, yesterdayLocalISO } from './localDate'

// Premier test du harnais unitaire (Incrément 1).
// Cible : le helper de date locale créé au Sprint 1 (fix B-C3 : ne plus
// utiliser toISOString() qui passe en UTC et décale d'un jour autour de minuit).
describe('localDate', () => {
  it('toLocalISO formate la date du calendrier local en YYYY-MM-DD (zéro-paddé)', () => {
    // Date construite à partir de composantes LOCALES → indépendant du fuseau
    // du runner (mois 0-indexé : 0 = janvier, 11 = décembre).
    expect(toLocalISO(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toLocalISO(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('addDaysISO franchit correctement les bornes de mois', () => {
    expect(addDaysISO('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDaysISO('2026-07-01', -1)).toBe('2026-06-30')
  })

  it('todayLocalISO / yesterdayLocalISO sont cohérents', () => {
    expect(todayLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(addDaysISO(todayLocalISO(), -1)).toBe(yesterdayLocalISO())
  })
})
