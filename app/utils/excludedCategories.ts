import type { ManagedCategory, Transaction } from '~/types'

/**
 * Construit un prédicat qui dit si une transaction appartient à une catégorie
 * OU une sous-catégorie marquée « exclue des calculs » (ex. désépargne :
 * virement sortant du Livret).
 *
 * Le rattachement reproduit la logique des stats SQL :
 *  - transaction catégorisée  → `tx.category` est l'UUID d'une sous-catégorie ;
 *  - transaction non catégorisée → `tx.category` est le NOM de la catégorie
 *    parente (ou « Autre »), à apparier par (type, nom).
 *
 * Une catégorie exclue exclut toutes ses sous-catégories ; une sous-catégorie
 * peut aussi être exclue individuellement même si sa catégorie ne l'est pas.
 */
export function buildExcludedMatcher(
  categories: ManagedCategory[],
): (tx: Pick<Transaction, 'category' | 'type'>) => boolean {
  const excludedSubcatIds = new Set<string>()
  const excludedNamesByType = new Set<string>()

  for (const cat of categories) {
    // Une catégorie exclue n'est appariable aux tx non catégorisées que par son nom
    if (cat.excluded) excludedNamesByType.add(`${cat.type}:${cat.name}`)
    for (const sub of cat.subcategories) {
      if (cat.excluded || sub.excluded) excludedSubcatIds.add(sub.id)
    }
  }

  // Aucun rattachement à calculer si rien n'est exclu
  if (!excludedSubcatIds.size && !excludedNamesByType.size) return () => false

  return (tx) =>
    excludedSubcatIds.has(tx.category) ||
    excludedNamesByType.has(`${tx.type}:${tx.category}`)
}
