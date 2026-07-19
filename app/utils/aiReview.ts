export type AiSortField = 'confidence' | 'date'
export type AiSortDir   = 'asc' | 'desc'

interface ReviewSortable {
  name:       string
  confidence: number
  date:       string
}

/** Normalise pour la recherche : minuscule, sans accents, trim. */
function norm(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Filtre par recherche (sur le nom) puis trie une liste de transactions à revoir.
 * - confidence asc = faible d'abord ; date asc = plus ancienne d'abord.
 * Ne mute pas l'entrée.
 */
export function filterAndSortReview<T extends ReviewSortable>(
  rows: readonly T[],
  search: string,
  field: AiSortField,
  dir: AiSortDir,
): T[] {
  const q = norm(search)
  const filtered = q ? rows.filter(r => norm(r.name).includes(q)) : rows
  const sorted = [...filtered]
  const sign = dir === 'asc' ? 1 : -1
  if (field === 'confidence') {
    sorted.sort((a, b) => (a.confidence - b.confidence) * sign)
  } else {
    sorted.sort((a, b) => a.date.localeCompare(b.date) * sign)
  }
  return sorted
}
