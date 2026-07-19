import type { ManagedCategory } from '~/types'

/**
 * Résout tx.category (UUID ou nom legacy) en nom de sous-catégorie pour l'affichage.
 * Retourne '' si aucune correspondance trouvée — ne retourne jamais de raw UUID.
 */
export function resolveCategoryLabel(
  subcatIdOrName: string,
  categories: ManagedCategory[],
): string {
  for (const cat of categories) {
    const sub = cat.subcategories.find(s => s.id === subcatIdOrName)
    if (sub) return sub.name
  }
  for (const cat of categories) {
    const sub = cat.subcategories.find(s => s.name === subcatIdOrName)
    if (sub) return sub.name
  }
  // Fallback : UUID de catégorie parent (pas de sous-catégorie sélectionnée)
  const parent = categories.find(c => c.id === subcatIdOrName)
  if (parent) return parent.name
  return ''
}

/**
 * Résout l'identifiant stocké dans tx.category (UUID ou nom legacy) en
 * remontant à la catégorie parente pour pré-remplir les dropdowns du formulaire.
 * Retourne aussi categoryId et subcategoryId (UUIDs) pour le stockage en DB.
 */
export function resolveCategory(
  subcatIdOrName: string,
  type: string,
  categories: ManagedCategory[],
): { category: string; categoryId: string; subcategory: string; subcategoryId: string } {
  // Tentative par ID (nouveau format)
  const parentById = categories.find(c =>
    c.type === type && c.subcategories.some(s => s.id === subcatIdOrName)
  )
  if (parentById) {
    const sub = parentById.subcategories.find(s => s.id === subcatIdOrName)!
    return { category: parentById.name, categoryId: parentById.id, subcategory: sub.name, subcategoryId: sub.id }
  }
  // Fallback par nom (ancien format / données non migrées)
  const parentByName = categories.find(c =>
    c.type === type && c.subcategories.some(s => s.name === subcatIdOrName)
  )
  if (parentByName) {
    const sub = parentByName.subcategories.find(s => s.name === subcatIdOrName)!
    return { category: parentByName.name, categoryId: parentByName.id, subcategory: sub.name, subcategoryId: sub.id }
  }
  // Fallback par UUID de catégorie parente (quand seule la catégorie a été sélectionnée)
  const catById = categories.find(c => c.id === subcatIdOrName)
  if (catById) {
    return { category: catById.name, categoryId: catById.id, subcategory: '', subcategoryId: '' }
  }
  return { category: subcatIdOrName, categoryId: '', subcategory: '', subcategoryId: '' }
}
