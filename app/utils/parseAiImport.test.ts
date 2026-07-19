import { describe, it, expect } from 'vitest'
import { parseAiImport, AI_CONFIDENCE_THRESHOLD } from './parseAiImport'
import type { ManagedCategory } from '~/types'

const categories: ManagedCategory[] = [
  {
    id: 'cat-sub', name: 'Abonnements', type: 'depense', iconKey: 'tv', color: '#000',
    isVariable: false, excluded: false, totalBudget: 0,
    subcategories: [
      { id: 'sub-streaming', name: 'Streaming', budget: null, envelope: null, excluded: false },
      { id: 'sub-sport',     name: 'Sport',     budget: null, envelope: null, excluded: false },
    ],
  },
  {
    id: 'cat-revenus', name: 'Revenus', type: 'revenu', iconKey: 'wallet', color: '#0f0',
    isVariable: false, excluded: false, totalBudget: 0,
    subcategories: [
      { id: 'sub-salaire', name: 'Salaire', budget: null, envelope: null, excluded: false },
    ],
  },
]

function json(transactions: unknown[]): string {
  return JSON.stringify({ transactions })
}

describe('parseAiImport', () => {
  it('résout "Parent > Sous-catégorie" vers l\'id de sous-catégorie', () => {
    const r = parseAiImport(json([
      { date: '2026-01-15', name: 'Netflix', amount: -13.99, type: 'depense', category: 'Abonnements > Streaming', confidence: 0.95 },
    ]), categories)
    expect(r.transactions).toHaveLength(1)
    expect(r.transactions[0]!.category).toBe('sub-streaming')
    expect(r.transactions[0]!.needsReview).toBe(false)
    expect(r.transactions[0]!.date).toBe('2026-01-15T12:00:00')
  })

  it('résout une sous-catégorie unique sans son parent, en ignorant accents/casse', () => {
    const r = parseAiImport(json([
      { date: '2026-01-15', name: 'X', amount: -10, type: 'depense', category: 'streaming', confidence: 0.9 },
    ]), categories)
    expect(r.transactions[0]!.category).toBe('sub-streaming')
  })

  it('adopte le type de la catégorie résolue (revenu) même si l\'IA dit depense', () => {
    const r = parseAiImport(json([
      { date: '2026-01-27', name: 'Paie', amount: 2500, type: 'depense', category: 'Revenus > Salaire', confidence: 0.99 },
    ]), categories)
    expect(r.transactions[0]!.type).toBe('revenu')
  })

  it('marque needsReview quand la catégorie est introuvable', () => {
    const r = parseAiImport(json([
      { date: '2026-01-15', name: 'Inconnu', amount: -5, type: 'depense', category: 'Voyages', confidence: 1 },
    ]), categories)
    expect(r.transactions[0]!.category).toBe('')
    expect(r.transactions[0]!.needsReview).toBe(true)
  })

  it('marque needsReview sous le seuil de confiance même avec catégorie valide', () => {
    const r = parseAiImport(json([
      { date: '2026-01-15', name: 'Netflix', amount: -13.99, type: 'depense', category: 'Abonnements > Streaming', confidence: AI_CONFIDENCE_THRESHOLD - 0.01 },
    ]), categories)
    expect(r.transactions[0]!.category).toBe('sub-streaming')
    expect(r.transactions[0]!.needsReview).toBe(true)
  })

  it('ignore les lignes invalides (date/montant manquants) et les compte dans skipped', () => {
    const r = parseAiImport(json([
      { date: '2026-01-15', name: 'OK', amount: -10, type: 'depense', category: 'Abonnements > Sport', confidence: 0.9 },
      { date: 'pas une date', name: 'Bad', amount: -10, type: 'depense', confidence: 0.9 },
      { date: '2026-01-16', name: 'Zero', amount: 0, type: 'depense', confidence: 0.9 },
    ]), categories)
    expect(r.transactions).toHaveLength(1)
    expect(r.skipped).toBe(2)
  })

  it('extrait le JSON même entouré de fences markdown et de texte', () => {
    const raw = 'Voici le résultat :\n```json\n' + json([
      { date: '2026-01-15', name: 'Netflix', amount: -13.99, type: 'depense', category: 'Abonnements > Streaming', confidence: 0.95 },
    ]) + '\n```\nVoilà !'
    const r = parseAiImport(raw, categories)
    expect(r.transactions).toHaveLength(1)
  })

  it('renvoie une erreur sur une entrée illisible', () => {
    expect(parseAiImport('bonjour', categories).error).toBe('invalid')
    expect(parseAiImport('', categories).error).toBe('invalid')
  })

  it('clamp la confiance hors bornes dans [0,1]', () => {
    const r = parseAiImport(json([
      { date: '2026-01-15', name: 'A', amount: -1, type: 'depense', category: 'Abonnements > Sport', confidence: 5 },
    ]), categories)
    expect(r.transactions[0]!.confidence).toBe(1)
  })

  it('accepte un tableau racine (sans clé "transactions")', () => {
    const raw = JSON.stringify([
      { date: '2026-01-15', name: 'Netflix', amount: -13.99, type: 'depense', category: 'Abonnements > Streaming', confidence: 0.9 },
    ])
    const r = parseAiImport(raw, categories)
    expect(r.transactions).toHaveLength(1)
  })

  it('tolère une date au format DD/MM/YYYY', () => {
    const r = parseAiImport(json([
      { date: '15/01/2026', name: 'X', amount: -5, type: 'depense', category: 'Abonnements > Sport', confidence: 0.9 },
    ]), categories)
    expect(r.transactions[0]!.date).toBe('2026-01-15T12:00:00')
  })

  it('coerce un montant fourni en chaîne', () => {
    const r = parseAiImport(json([
      { date: '2026-01-15', name: 'X', amount: '-12.5', type: 'depense', category: 'Abonnements > Sport', confidence: 0.9 },
    ]), categories)
    expect(r.transactions[0]!.amount).toBe(-12.5)
  })
})
