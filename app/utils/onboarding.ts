import type { ManagedCategory, TransactionForm, TransactionType } from '~/types'

/** Brouillon d'une ligne récurrente saisie pendant l'onboarding. */
export interface RecurringDraft {
  label:         string
  amount:        number
  type:          TransactionType
  day:           number
  /** Lien direct vers la sous-catégorie créée à l'étape Profil ('' = non catégorisé). */
  subcategoryId: string
}

/** Construit la date du mois courant pour un jour donné (zéro-paddé, AAAA-MM-JJ). */
export function recurringDate(refDate: Date, day: number): string {
  const year  = refDate.getFullYear()
  const month = String(refDate.getMonth() + 1).padStart(2, '0')
  const d      = String(day).padStart(2, '0')
  return `${year}-${month}-${d}`
}

/**
 * Transforme une ligne récurrente en `TransactionForm`.
 * Le lien à la catégorie se fait par **ID** (et non par libellé) : c'est robuste
 * aux traductions et aux renommages. Une ligne sans `subcategoryId` reste valide
 * (récurrence non catégorisée).
 */
export function buildRecurringForm(
  item:       RecurringDraft,
  categories: ManagedCategory[],
  refDate:    Date,
): TransactionForm {
  let category = '', categoryId = '', subcategory = '', subcategoryId = ''

  if (item.subcategoryId) {
    for (const cat of categories) {
      const sub = cat.subcategories.find(s => s.id === item.subcategoryId)
      if (sub) {
        category      = cat.name
        categoryId    = cat.id
        subcategory   = sub.name
        subcategoryId = sub.id
        break
      }
    }
  }

  return {
    amount:           item.amount,
    label:            item.label.trim(),
    note:             '',
    date:             recurringDate(refDate, item.day),
    accountingDate:   '',
    recurring:        true,
    frequency:        'monthly',
    recurringEndDate: '',
    accountingOffset: 'same_month',
    type:             item.type,
    category,
    categoryId,
    subcategory,
    subcategoryId,
    horsBudget:       false,
  }
}

/** Verdict de conformité d'une enveloppe vs sa cible (tolérance ±5 %). */
export type EnvelopeConformity = 'ok' | 'over' | 'under'

export function envelopeConformity(target: number, allocated: number): EnvelopeConformity {
  if (target <= 0) return 'ok'
  const diff = (allocated - target) / target
  if (Math.abs(diff) <= 0.05) return 'ok'
  return diff > 0 ? 'over' : 'under'
}
