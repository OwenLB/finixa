import { describe, it, expect } from 'vitest'
import { filterAndSortReview } from './aiReview'

interface Row { name: string; confidence: number; date: string }

const rows: Row[] = [
  { name: 'Netflix',    confidence: 0.95, date: '2026-01-15T12:00:00' },
  { name: 'Café',       confidence: 0.40, date: '2026-03-02T12:00:00' },
  { name: 'Loyer',      confidence: 0.80, date: '2026-02-05T12:00:00' },
]

describe('filterAndSortReview', () => {
  it('trie par confiance croissante (faible d\'abord) en asc', () => {
    const out = filterAndSortReview(rows, '', 'confidence', 'asc')
    expect(out.map(r => r.name)).toEqual(['Café', 'Loyer', 'Netflix'])
  })

  it('inverse en desc (forte d\'abord)', () => {
    const out = filterAndSortReview(rows, '', 'confidence', 'desc')
    expect(out.map(r => r.name)).toEqual(['Netflix', 'Loyer', 'Café'])
  })

  it('trie par date asc (plus ancienne) et desc (plus récente)', () => {
    expect(filterAndSortReview(rows, '', 'date', 'asc').map(r => r.name)).toEqual(['Netflix', 'Loyer', 'Café'])
    expect(filterAndSortReview(rows, '', 'date', 'desc').map(r => r.name)).toEqual(['Café', 'Loyer', 'Netflix'])
  })

  it('filtre par nom, insensible à la casse et aux accents', () => {
    expect(filterAndSortReview(rows, 'cafe', 'date', 'asc').map(r => r.name)).toEqual(['Café'])
    expect(filterAndSortReview(rows, 'NET', 'date', 'asc').map(r => r.name)).toEqual(['Netflix'])
  })

  it('ne mute pas le tableau d\'entrée', () => {
    const snapshot = rows.map(r => r.name)
    filterAndSortReview(rows, '', 'confidence', 'desc')
    expect(rows.map(r => r.name)).toEqual(snapshot)
  })

  it('renvoie vide si la recherche ne matche rien', () => {
    expect(filterAndSortReview(rows, 'zzz', 'date', 'asc')).toEqual([])
  })
})
