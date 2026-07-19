import type { ManagedCategory, Transaction } from '~/types'

/**
 * Construit le prédicat de filtrage « catégorie / sous-catégorie » des transactions.
 *
 * Règle clé : si une catégorie est sélectionnée ET qu'au moins une de ses
 * sous-catégories l'est aussi, la sélection se RESTREINT à ces sous-catégories
 * (au lieu de tout afficher). Sans ça, le filtre par catégorie « écrasait » le
 * filtre par sous-catégorie (OR dominant) — la sous-catégorie semblait sans effet.
 *
 * Le champ `tx.category` contient soit l'UUID d'une sous-catégorie (tx catégorisée),
 * soit le nom de la catégorie parente / « Autre » (tx non catégorisée).
 */
export function buildCategoryFilter(
  categories: ManagedCategory[],
  selectedCatNames: string[],
  selectedSubNames: string[],
): (tx: Pick<Transaction, 'category'>) => boolean {
  if (!selectedCatNames.length && !selectedSubNames.length) return () => true

  const allSubs = categories.flatMap(c => c.subcategories)

  // Clés (id + nom) des sous-catégories explicitement sélectionnées
  const subKeys = new Set<string>()
  for (const subName of selectedSubNames) {
    const sub = allSubs.find(s => s.name === subName)
    if (sub) { subKeys.add(sub.id); subKeys.add(sub.name) }
    else subKeys.add(subName)
  }

  const selectedSubNameSet = new Set(selectedSubNames)

  // Clés des catégories sélectionnées « en entier » : celles sans aucune
  // sous-catégorie sélectionnée (sinon elles sont restreintes via subKeys).
  const catKeys = new Set<string>()
  for (const catName of selectedCatNames) {
    const cat = categories.find(c => c.name === catName)
    if (!cat) { catKeys.add(catName); continue } // catégorie inconnue → match par nom
    const narrowed = cat.subcategories.some(s => selectedSubNameSet.has(s.name))
    if (narrowed) continue
    catKeys.add(cat.name)
    for (const s of cat.subcategories) { catKeys.add(s.id); catKeys.add(s.name) }
  }

  return (tx) => subKeys.has(tx.category) || catKeys.has(tx.category)
}
