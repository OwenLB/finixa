import { describe, it, expect } from 'vitest'
import { buildAiImportPrompt } from './aiImportPrompt'
import type { ManagedCategory } from '~/types'

const categories: ManagedCategory[] = [
  {
    id: 'c1', name: 'Abonnements', type: 'depense', iconKey: 'tv', color: '#000',
    isVariable: false, excluded: false, totalBudget: 0,
    subcategories: [
      { id: 's1', name: 'Streaming', budget: null, envelope: null, excluded: false },
      { id: 's2', name: 'Sport',     budget: null, envelope: null, excluded: false },
    ],
  },
  {
    id: 'c2', name: 'Divers', type: 'depense', iconKey: 'box', color: '#111',
    isVariable: false, excluded: false, totalBudget: 0,
    subcategories: [],
  },
]

describe('buildAiImportPrompt', () => {
  it('liste chaque sous-catégorie au format "Parent > Sous-catégorie"', () => {
    const p = buildAiImportPrompt(categories, 'fr')
    expect(p).toContain('- Abonnements > Streaming')
    expect(p).toContain('- Abonnements > Sport')
  })

  it('liste une catégorie sans sous-catégorie par son nom seul', () => {
    const p = buildAiImportPrompt(categories, 'fr')
    expect(p).toContain('- Divers')
    expect(p).not.toContain('- Divers >')
  })

  it('impose le schéma JSON de retour (transactions + confidence)', () => {
    const p = buildAiImportPrompt(categories, 'fr')
    expect(p).toContain('"transactions"')
    expect(p).toContain('"confidence"')
    expect(p).toContain('"amount"')
  })

  it('bascule la langue selon la locale', () => {
    expect(buildAiImportPrompt(categories, 'fr')).toContain('relevé de compte')
    expect(buildAiImportPrompt(categories, 'en')).toContain('bank statement')
  })
})
