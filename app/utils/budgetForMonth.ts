export interface BudgetVersion {
  effective_from: string   // 'YYYY-MM'
  budget:         number | null
}

/**
 * Budget applicable pour un mois donné = version dont `effective_from` est le
 * plus grand tout en restant <= au mois demandé. Aucune version antérieure au
 * mois → `null` (la sous-catégorie existe mais n'a pas de budget ce mois-là).
 *
 * Modèle « identité stable + historique de budget » : la catégorisation se fait
 * par id (toujours valide), le budget est résolu par mois ici.
 */
export function budgetForMonth(versions: BudgetVersion[], month: string): number | null {
  let best: BudgetVersion | null = null
  for (const v of versions) {
    if (v.effective_from <= month && (best === null || v.effective_from > best.effective_from)) {
      best = v
    }
  }
  return best ? best.budget : null
}
