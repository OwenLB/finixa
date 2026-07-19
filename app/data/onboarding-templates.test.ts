import { describe, it, expect } from 'vitest'
import { buildOnboardingDraft, TEMPLATES } from './onboarding-templates'

describe('buildOnboardingDraft', () => {
  it('met les budgets à l’échelle du revenu (budget = revenu × pct)', () => {
    const draft = buildOnboardingDraft('employe', 2000)
    // Revenus > Salaire en tête = le revenu (100 %)
    expect(draft[0]!.name).toBe('Revenus')
    expect(draft[0]!.subcategories[0]).toMatchObject({ name: 'Salaire', budget: 2000 })

    // Loyer = 25 % de 2000 = 500
    const logement = draft.find(c => c.name === 'Logement')!
    const loyer    = logement.subcategories.find(s => s.name === 'Loyer')!
    expect(loyer.budget).toBe(500)
  })

  it('change d’échelle quand le revenu change', () => {
    const loyer = (income: number) =>
      buildOnboardingDraft('employe', income).find(c => c.name === 'Logement')!
        .subcategories.find(s => s.name === 'Loyer')!.budget
    expect(loyer(2000)).toBe(500)
    expect(loyer(4000)).toBe(1000)
  })

  it('sans revenu : pas de salaire, budgets à null (suivi simple)', () => {
    const draft = buildOnboardingDraft('employe', null)
    expect(draft.some(c => c.name === 'Revenus')).toBe(false)
    expect(draft.every(c => c.subcategories.every(s => s.budget === null))).toBe(true)
  })

  it('revenu = 0 traité comme absent', () => {
    const draft = buildOnboardingDraft('employe', 0)
    expect(draft.some(c => c.name === 'Revenus')).toBe(false)
  })

  it('profil "custom" = aucune catégorie', () => {
    expect(buildOnboardingDraft('custom', 3000)).toEqual([])
  })

  it('profil inconnu = tableau vide', () => {
    expect(buildOnboardingDraft('zzz', 1000)).toEqual([])
  })

  it('préserve icône, couleur et enveloppe du template', () => {
    const draft = buildOnboardingDraft('employe', 2000)
    const epargne = draft.find(c => c.name === 'Épargne')!
    expect(epargne.type).toBe('epargne')
    expect(epargne.subcategories[0]!.envelope).toBe('savings')
  })

  it('les pourcentages des profils restent dans une enveloppe réaliste (≤ 100 %)', () => {
    for (const tpl of TEMPLATES) {
      const total = tpl.categories.reduce(
        (sum, c) => sum + c.subcategories.reduce((s, sub) => s + sub.pct, 0), 0,
      )
      expect(total).toBeLessThanOrEqual(1)
    }
  })
})
