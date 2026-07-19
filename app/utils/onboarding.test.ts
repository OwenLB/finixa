import { describe, it, expect } from 'vitest'
import { recurringDate, buildRecurringForm, envelopeConformity } from './onboarding'
import type { ManagedCategory } from '~/types'

describe('recurringDate', () => {
  it('zéro-padde le mois et le jour (AAAA-MM-JJ)', () => {
    expect(recurringDate(new Date(2026, 0, 15), 3)).toBe('2026-01-03')
  })

  it('gère les jours/mois à deux chiffres', () => {
    expect(recurringDate(new Date(2026, 10, 1), 28)).toBe('2026-11-28')
  })
})

const cats: ManagedCategory[] = [
  {
    id: 'c1', name: 'Logement', type: 'depense', iconKey: 'home', color: '#000',
    isVariable: false, excluded: false, totalBudget: 0,
    subcategories: [{ id: 's1', name: 'Loyer', budget: 800, envelope: 'needs', excluded: false }],
  },
]

describe('buildRecurringForm', () => {
  it('lie la catégorie par ID (robuste aux traductions/renommages)', () => {
    const form = buildRecurringForm(
      { label: 'Loyer', amount: 800, type: 'depense', day: 1, subcategoryId: 's1' },
      cats,
      new Date(2026, 2, 10),
    )
    expect(form).toMatchObject({
      category: 'Logement', categoryId: 'c1',
      subcategory: 'Loyer', subcategoryId: 's1',
      recurring: true, frequency: 'monthly', date: '2026-03-01',
    })
  })

  it('reste valide sans subcategoryId (récurrence non catégorisée)', () => {
    const form = buildRecurringForm(
      { label: 'Assurance', amount: 30, type: 'depense', day: 5, subcategoryId: '' },
      cats,
      new Date(2026, 2, 10),
    )
    expect(form.category).toBe('')
    expect(form.subcategoryId).toBe('')
    expect(form.label).toBe('Assurance')
  })

  it('ignore un subcategoryId introuvable (pas de lien)', () => {
    const form = buildRecurringForm(
      { label: 'X', amount: 1, type: 'depense', day: 1, subcategoryId: 'inconnu' },
      cats,
      new Date(2026, 2, 10),
    )
    expect(form.categoryId).toBe('')
    expect(form.subcategoryId).toBe('')
  })

  it('trim le label', () => {
    const form = buildRecurringForm(
      { label: '  Loyer  ', amount: 800, type: 'depense', day: 1, subcategoryId: 's1' },
      cats,
      new Date(2026, 2, 10),
    )
    expect(form.label).toBe('Loyer')
  })
})

describe('envelopeConformity', () => {
  it('ok dans la tolérance ±5 %', () => {
    expect(envelopeConformity(1000, 1000)).toBe('ok')
    expect(envelopeConformity(1000, 1050)).toBe('ok')
    expect(envelopeConformity(1000, 950)).toBe('ok')
  })

  it('over au-delà de +5 %', () => {
    expect(envelopeConformity(1000, 1100)).toBe('over')
  })

  it('under en-deçà de -5 %', () => {
    expect(envelopeConformity(1000, 800)).toBe('under')
  })

  it('cible nulle => ok (pas de division par zéro)', () => {
    expect(envelopeConformity(0, 500)).toBe('ok')
  })
})
