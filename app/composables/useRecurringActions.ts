import type { Ref } from 'vue'
import type { Transaction, TransactionForm, RecurringExpense } from '~/types'
import { getSessionUserId } from '~/utils/auth'
import { addDaysISO } from '~/utils/localDate'
import { nextOccurrenceDate } from '~/utils/detectRecurring'
import {
  insertTransaction,
  updateTransaction,
  deleteTransaction,
  bulkRelinkToRecurring,
} from '~/services/transactionService'

/**
 * Encapsule les opérations complexes sur les occurrences récurrentes,
 * extraites de useTransactionStore pour alléger ce dernier.
 */

export function useRecurringActions(
  transactions: Ref<Transaction[]>,
  refetch: () => Promise<void>,
) {
  const supabase       = useSupabaseClient()
  const recurringStore = useRecurringStore()

  /**
   * Modifie une définition récurrente depuis la gestion "Plus" (pas une occurrence).
   * Re-lie les transactions réelles existantes vers la nouvelle définition.
   */
  async function updateRecurringDefinition(id: string, form: TransactionForm) {
    try {
      const newRec = await recurringStore.update(id, form)

      const linkedTxs = transactions.value.filter(tx => !tx.virtual && tx.recurringId === id)

      if (linkedTxs.length > 0) {
        const signedAmount = form.type === 'revenu' ? Math.abs(form.amount) : -Math.abs(form.amount)
        await bulkRelinkToRecurring(
          supabase,
          linkedTxs.map(tx => tx.id),
          newRec.id,
          form.label || form.category || linkedTxs[0]!.name,
          signedAmount,
          form.type,
          form.subcategoryId || form.categoryId || '',
          !!form.category,
        )
      }
    } finally {
      await refetch()
    }
  }

  /**
   * Bornes d'exclusion d'une occurrence, quelle que soit la fréquence :
   * - closeDate : veille de l'occurrence (les occurrences antérieures du même
   *   mois — cas hebdo — restent couvertes par l'ancienne définition)
   * - reopenStart : date de l'occurrence suivante, calculée par fréquence
   *   (l'ancre hebdo/trimestrielle/annuelle est préservée, contrairement à
   *   l'ancienne logique "mois suivant" qui décalait les cycles)
   */
  function occurrenceBounds(tx: Transaction, rec: RecurringExpense | undefined) {
    const occDate = tx.date.slice(0, 10)
    return {
      closeDate:   addDaysISO(occDate, -1),
      reopenStart: rec ? nextOccurrenceDate(occDate, rec.frequency, rec.dayOfMonth) : null,
    }
  }

  /**
   * Modifie une occurrence d'une récurrence.
   * scope='occurrence' : cette occurrence uniquement — ferme/rouvre la définition.
   * scope='future' : cette occurrence et les suivantes — crée une nouvelle définition.
   */
  async function updateRecurringOccurrence(
    tx: Transaction,
    form: TransactionForm,
    scope: 'occurrence' | 'future',
  ) {
    try {
      const recId           = tx.recurringId!
      const originalRec     = recurringStore.recurringExpenses.find(r => r.id === recId)
      const originalEndDate = originalRec?.endDate ?? null
      const { closeDate, reopenStart } = occurrenceBounds(tx, originalRec)

      if (scope === 'occurrence') {
        // 1. Réinsérer la suite AVANT de toucher l'ancienne définition :
        //    si l'insert échoue, rien n'a été perdu
        if (originalRec && reopenStart && (originalEndDate === null || originalEndDate >= reopenStart)) {
          await recurringStore.insertRaw({
            name:             originalRec.name,
            amount:           originalRec.amount,
            type:             originalRec.type,
            category:         originalRec.category,
            categorized:      originalRec.categorized,
            frequency:        originalRec.frequency,
            dayOfMonth:       originalRec.dayOfMonth,
            startDate:        reopenStart,
            endDate:          originalEndDate,
            accountingOffset: originalRec.accountingOffset ?? 'same_month',
          })
        }

        // 2. Clôturer (ou supprimer) l'ancienne définition la veille de l'occurrence
        if (originalRec && closeDate >= originalRec.startDate) {
          await recurringStore.close(recId, closeDate)
        } else {
          await recurringStore.remove(recId)
        }

        const standaloneForm = { ...form, recurring: false }
        const userId = await getSessionUserId(supabase)
        if (tx.virtual) {
          const realTx = await insertTransaction(supabase, userId, standaloneForm, null)
          const idx = transactions.value.findIndex(t => t.id === tx.id)
          if (idx !== -1) transactions.value[idx] = realTx
          else transactions.value.push(realTx)
        } else {
          const updated = await updateTransaction(supabase, tx.id, standaloneForm, tx, null)
          if (updated) {
            const idx = transactions.value.findIndex(t => t.id === tx.id)
            if (idx !== -1) transactions.value[idx] = updated
          }
        }
      } else {
        const originalDom = originalRec?.dayOfMonth ?? parseInt(tx.date.slice(8, 10))
        const futureDom   = parseInt(form.date.slice(8, 10)) || originalDom

        // 1. Nouvelle définition à partir de l'occurrence éditée
        const newRec = await recurringStore.insertRaw({
          name:             form.label || form.subcategory || form.category || (originalRec?.name ?? 'Récurrent'),
          amount:           form.type === 'revenu' ? Math.abs(form.amount) : -Math.abs(form.amount),
          type:             form.type,
          category:         form.subcategoryId || form.categoryId || originalRec?.category || '',
          categorized:      !!form.category,
          frequency:        form.frequency || originalRec?.frequency || 'monthly',
          dayOfMonth:       futureDom,
          startDate:        form.date,
          endDate:          form.recurringEndDate || null,
          accountingOffset: form.accountingOffset ?? originalRec?.accountingOffset ?? 'same_month',
        })

        // 2. Clôturer l'ancienne la veille de l'occurrence
        if (originalRec && closeDate >= originalRec.startDate) {
          await recurringStore.close(recId, closeDate)
        } else {
          await recurringStore.remove(recId)
        }

        if (!tx.virtual) {
          const updated = await updateTransaction(supabase, tx.id, form, tx, newRec.id)
          if (updated) {
            const idx = transactions.value.findIndex(t => t.id === tx.id)
            if (idx !== -1) transactions.value[idx] = updated
          }
        } else {
          transactions.value = transactions.value.filter(t => t.id !== tx.id)
        }
      }
    } finally {
      await refetch()
    }
  }

  /**
   * Supprime une occurrence d'une récurrence.
   * Ferme la définition la veille de l'occurrence et la rouvre à l'occurrence
   * suivante (calculée selon la fréquence).
   */
  async function deleteRecurringOccurrence(tx: Transaction) {
    try {
      const recId           = tx.recurringId!
      const originalRec     = recurringStore.recurringExpenses.find(r => r.id === recId)
      const originalEndDate = originalRec?.endDate ?? null
      const { closeDate, reopenStart } = occurrenceBounds(tx, originalRec)

      // 1. Réinsérer la suite avant de toucher l'ancienne définition
      if (originalRec && reopenStart && (originalEndDate === null || originalEndDate >= reopenStart)) {
        await recurringStore.insertRaw({
          name:             originalRec.name,
          amount:           originalRec.amount,
          type:             originalRec.type,
          category:         originalRec.category,
          categorized:      originalRec.categorized,
          frequency:        originalRec.frequency,
          dayOfMonth:       originalRec.dayOfMonth,
          startDate:        reopenStart,
          endDate:          originalEndDate,
          accountingOffset: originalRec.accountingOffset ?? 'same_month',
        })
      }

      // 2. Clôturer (ou supprimer) l'ancienne définition
      if (originalRec && closeDate >= originalRec.startDate) {
        await recurringStore.close(recId, closeDate)
      } else {
        await recurringStore.remove(recId)
      }

      if (!tx.virtual) {
        await deleteTransaction(supabase, tx.id)
      }
      transactions.value = transactions.value.filter(t => t.id !== tx.id)
    } finally {
      await refetch()
    }
  }

  return { updateRecurringDefinition, updateRecurringOccurrence, deleteRecurringOccurrence }
}
