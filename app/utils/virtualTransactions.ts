import type { Transaction, RecurringExpense } from '~/types'
import { getDatesInRange, getOccurrenceKey } from '~/services/recurringService'

/**
 * Calcule les occurrences virtuelles (non persistées en DB) d'une liste de récurrences
 * pour une période donnée, en excluant les occurrences déjà couvertes par une transaction réelle.
 *
 * Déduplication :
 *   1. Par (recurring_id, recurrence_occurrence) — format stable, nouveau standard.
 *   2. Fallback par (recurring_id, date) — pour les transactions créées avant la migration.
 */
export function buildVirtualTransactions(
  realTxs: Transaction[],
  recurringList: RecurringExpense[],
  dateRange: { start: string; end: string },
): Transaction[] {
  const rangeStart = new Date(dateRange.start)
  const rangeEnd   = new Date(dateRange.end)

  // Index principal : clé d'occurrence (nouveau format)
  const coveredByKey = new Set(
    realTxs
      .filter(tx => tx.recurringId && tx.recurrenceOccurrence)
      .map(tx => `${tx.recurringId}|${tx.recurrenceOccurrence}`),
  )

  // Fallback : déduplication par date exacte (données antérieures à la migration)
  const coveredByDate = new Set(
    realTxs
      .filter(tx => tx.recurringId && !tx.recurrenceOccurrence)
      .map(tx => `${tx.recurringId}|${tx.date.slice(0, 10)}`),
  )

  const virtual: Transaction[] = []

  for (const rec of recurringList) {
    // Pour next_month : on génère l'occurrence du mois précédent (qui sera comptée sur le mois courant)
    const occStart = rec.accountingOffset === 'next_month'
      ? new Date(rangeStart.getFullYear(), rangeStart.getMonth() - 1, 1)
      : rangeStart
    const occEnd = rec.accountingOffset === 'next_month'
      ? rangeStart
      : rangeEnd

    for (const date of getDatesInRange(rec, occStart, occEnd)) {
      const occKey = getOccurrenceKey(date, rec.frequency)

      if (coveredByKey.has(`${rec.id}|${occKey}`))             continue
      if (coveredByDate.has(`${rec.id}|${date.slice(0, 10)}`)) continue

      let accountingDate: string | null = null
      if (rec.accountingOffset === 'next_month') {
        const d = new Date(date.length === 10 ? date + 'T12:00:00' : date)
        const y = d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear()
        const m = String(d.getMonth() === 11 ? 1 : d.getMonth() + 2).padStart(2, '0')
        accountingDate = `${y}-${m}-01`
      }

      virtual.push({
        id:                   `virtual-${rec.id}-${occKey}`,
        name:                 rec.name,
        category:             rec.category,
        categorized:          rec.categorized,
        amount:               rec.amount,
        date,
        accountingDate,
        type:                 rec.type,
        recurringId:          rec.id,
        recurrenceOccurrence: occKey,
        virtual:              true,
        status:               'pending',
        horsBudget:           false,
      })
    }
  }

  return virtual
}
