import { HelpCircle } from 'lucide-vue-next'
import type { Component } from 'vue'
import type { ManagedCategory } from '~/types'
import { getIcon } from '~/utils/iconRegistry'

export interface IconStyle {
  icon:      Component
  iconBg:    string
  iconColor: string
}

const FALLBACK: IconStyle = { icon: HelpCircle, iconBg: '#9ca3af20', iconColor: '#9ca3af' }

function fromCategory(cat: ManagedCategory): IconStyle {
  return {
    icon:      getIcon(cat.iconKey),
    iconBg:    cat.color + '20',
    iconColor: cat.color,
  }
}

/**
 * Résout l'icône d'une catégorie ou sous-catégorie depuis les données du store.
 * - Correspondance directe  → icône de la catégorie
 * - Sous-catégorie          → hérite de l'icône de la catégorie parente
 * - Non trouvé              → fallback HelpCircle
 */
export function getCategoryIcon(subcatIdOrName: string, allCategories?: ManagedCategory[]): IconStyle {
  if (!allCategories?.length) return FALLBACK

  const direct = allCategories.find(cat => cat.name === subcatIdOrName)
  if (direct) return fromCategory(direct)

  // Par ID (nouveau format)
  const parentById = allCategories.find(cat =>
    cat.subcategories.some(sub => sub.id === subcatIdOrName)
  )
  if (parentById) return fromCategory(parentById)

  // Par nom (ancien format / fallback)
  const parentByName = allCategories.find(cat =>
    cat.subcategories.some(sub => sub.name === subcatIdOrName)
  )
  if (parentByName) return fromCategory(parentByName)

  return FALLBACK
}
