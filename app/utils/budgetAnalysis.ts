import type { ManagedCategory, TransactionType } from '~/types'

export interface BudgetAnalysisRow {
  categoryId:    string
  subId:         string
  name:          string
  categoryName:  string
  type:          TransactionType
  color:         string
  currentBudget: number | null
  avgSpent:      number          // moyenne mensuelle réelle
  suggested:     number          // moyenne arrondie
  delta:         number          // suggested - (currentBudget ?? 0)
}

/** Arrondit une suggestion de budget à un palier lisible. */
export function roundSuggestion(value: number): number {
  if (value <= 0) return 0
  if (value < 50) return Math.round(value)
  if (value < 200) return Math.round(value / 5) * 5
  return Math.round(value / 10) * 10
}

/**
 * Construit les lignes d'analyse : pour chaque sous-catégorie de dépense/épargne,
 * compare le budget actuel à la moyenne mensuelle réelle (total / mois actifs).
 * - Les revenus sont ignorés.
 * - Les lignes sans budget ET sans dépense sont masquées.
 * - Tri par plus gros écart d'abord.
 */
export function buildAnalysisRows(
  categories: ManagedCategory[],
  totals: Map<string, number>,
  activeMonths: number,
): BudgetAnalysisRow[] {
  const divisor = Math.max(activeMonths, 1)
  const out: BudgetAnalysisRow[] = []

  for (const cat of categories) {
    if (cat.type === 'revenu') continue
    for (const sub of cat.subcategories) {
      const total   = totals.get(sub.id) ?? 0
      const avg     = total / divisor
      const current = sub.budget
      if ((current == null || current === 0) && avg === 0) continue
      const suggested = roundSuggestion(avg)
      out.push({
        categoryId:    cat.id,
        subId:         sub.id,
        name:          sub.name,
        categoryName:  cat.name,
        type:          cat.type,
        color:         cat.color,
        currentBudget: current,
        avgSpent:      avg,
        suggested,
        delta:         suggested - (current ?? 0),
      })
    }
  }

  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}
