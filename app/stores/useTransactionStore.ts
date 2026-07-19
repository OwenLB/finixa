import { defineStore } from 'pinia'
import type { Transaction, TransactionForm, TransactionType } from '~/types'
import { getSessionUserId } from '~/utils/auth'
import { usePeriodStore } from '~/stores/usePeriodStore'
import { useRecurringStore } from '~/stores/useRecurringStore'
import { useCategoryStatsStore } from '~/stores/useCategoryStatsStore'
import { buildVirtualTransactions } from '~/utils/virtualTransactions'
import { useRecurringActions } from '~/composables/useRecurringActions'
import {
  fetchTransactions,
  countUncategorizedTransactions,
  insertTransaction,
  insertMaterializedTransaction,
  updateTransaction,
  deleteTransaction,
  toggleTransactionStatus,
  bulkDeleteTransactions,
  bulkSetStatus,
  bulkSetCategory as bulkSetCategoryService,
  bulkInsertTransactions,
} from '~/services/transactionService'

export const useTransactionStore = defineStore('transactions', () => {
  const supabase            = useSupabaseClient()
  const periodStore         = usePeriodStore()
  const recurringStore      = useRecurringStore()
  const categoryStatsStore  = useCategoryStatsStore()
  const user                = useSupabaseUser()

  const transactions       = ref<Transaction[]>([])
  const uncategorizedTotal = ref(0)
  const loading            = ref(false)
  const error              = ref<string | null>(null)

  let fetchSeq    = 0
  let fetchTimer: ReturnType<typeof setTimeout> | null = null

  async function fetch() {
    if (!user.value) return
    const seq = ++fetchSeq
    loading.value = true
    error.value   = null
    try {
      const [realTxs, , uncatCount] = await Promise.all([
        fetchTransactions(supabase, periodStore.dateRange),
        recurringStore.fetch(),
        countUncategorizedTransactions(supabase),
      ])
      if (seq !== fetchSeq) return   // stale — a newer fetch has started
      uncategorizedTotal.value = uncatCount
      const virtualTxs = buildVirtualTransactions(realTxs, recurringStore.recurringExpenses, periodStore.dateRange)
      transactions.value = [...realTxs, ...virtualTxs]
        .sort((a, b) => (b.accountingDate ?? b.date.slice(0, 10)).localeCompare(a.accountingDate ?? a.date.slice(0, 10)))
    } catch (e) {
      if (seq !== fetchSeq) return
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des transactions'
    } finally {
      if (seq === fetchSeq) loading.value = false
    }
  }

  function debouncedFetch() {
    if (fetchTimer) clearTimeout(fetchTimer)
    fetchTimer = setTimeout(fetch, 250)
  }

  watch(() => `${periodStore.dateRange.start}|${periodStore.dateRange.end}`, debouncedFetch)

  async function add(form: TransactionForm) {
    try {
      if (form.recurring) {
        // Récurrence : créer uniquement la définition — les occurrences virtuelles
        // sont générées par buildVirtualTransactions au prochain fetch.
        await recurringStore.add(form)
        await fetch()
      } else {
        const userId = await getSessionUserId(supabase)
        const tx = await insertTransaction(supabase, userId, form, null)
        transactions.value.unshift(tx)
        transactions.value.sort((a, b) => (b.accountingDate ?? b.date.slice(0, 10)).localeCompare(a.accountingDate ?? a.date.slice(0, 10)))
      }
      void categoryStatsStore.fetchMonth()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de l\'ajout de la transaction'
      throw e
    }
  }

  async function update(id: string, form: TransactionForm) {
    try {
      const existing = transactions.value.find(t => t.id === id)
      if (!existing) return
      const tx = await updateTransaction(supabase, id, form, existing)
      if (tx) {
        const index = transactions.value.findIndex(t => t.id === id)
        if (index !== -1) transactions.value[index] = tx
      }
      void categoryStatsStore.fetchMonth()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la mise à jour de la transaction'
      throw e
    }
  }

  async function remove(id: string) {
    try {
      await deleteTransaction(supabase, id)
      transactions.value = transactions.value.filter(t => t.id !== id)
      void categoryStatsStore.fetchMonth()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la suppression de la transaction'
      throw e
    }
  }

  async function toggleStatus(id: string) {
    try {
      const tx = transactions.value.find(t => t.id === id)
      if (!tx) return

      if (tx.virtual) {
        if (!tx.recurringId) throw new Error('Transaction virtuelle sans recurringId — impossible de matérialiser')
        const userId = await getSessionUserId(supabase)
        const realTx = await insertMaterializedTransaction(supabase, userId, tx, 'checked')
        const idx = transactions.value.findIndex(t => t.id === id)
        if (idx !== -1) transactions.value[idx] = realTx
        void categoryStatsStore.fetchMonth()
        return realTx
      }

      const result = await toggleTransactionStatus(supabase, id, tx.status)
      tx.status = result.status
      tx.accountingDate = result.accountingDate
      void categoryStatsStore.fetchMonth()
      return tx
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du changement de statut'
      throw e
    }
  }

  async function bulkRemove(ids: string[]) {
    try {
      await bulkDeleteTransactions(supabase, ids)
      transactions.value = transactions.value.filter(t => !ids.includes(t.id))
      void categoryStatsStore.fetchMonth()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la suppression groupée'
      throw e
    }
  }

  async function bulkToggleStatus(ids: string[]): Promise<'checked' | 'pending'> {
    try {
      const txs     = ids.map(id => transactions.value.find(t => t.id === id)).filter(Boolean) as Transaction[]
      const allDone = txs.every(t => t.status === 'checked')
      const newStatus: 'checked' | 'pending' = allDone ? 'pending' : 'checked'
      await bulkSetStatus(supabase, ids, newStatus)
      for (const tx of txs) {
        tx.status        = newStatus
        tx.accountingDate = newStatus === 'checked' ? tx.date.slice(0, 10) : null
      }
      void categoryStatsStore.fetchMonth()
      return newStatus
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du changement de statut groupé'
      throw e
    }
  }

  async function bulkSetCategory(ids: string[], category: string, categorized: boolean, type: TransactionType) {
    try {
      await bulkSetCategoryService(supabase, ids, category, categorized, type)
      for (const id of ids) {
        const tx = transactions.value.find(t => t.id === id)
        if (tx) { tx.category = category; tx.categorized = categorized; tx.type = type }
      }
      void categoryStatsStore.fetchMonth()
      void countUncategorizedTransactions(supabase).then(n => { uncategorizedTotal.value = n })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la catégorisation groupée'
      throw e
    }
  }

  async function bulkImport(
    rows: Array<{ name: string; amount: number; date: string; type: TransactionType; category?: string; categorized?: boolean }>,
  ): Promise<number> {
    try {
      const userId   = await getSessionUserId(supabase)
      const inserted = await bulkInsertTransactions(supabase, userId, rows)
      transactions.value.push(...inserted)
      transactions.value.sort((a, b) => (b.accountingDate ?? b.date.slice(0, 10)).localeCompare(a.accountingDate ?? a.date.slice(0, 10)))
      void categoryStatsStore.fetchMonth()
      return inserted.length
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de l\'import CSV'
      throw e
    }
  }

  function getById(id: string): Transaction | undefined {
    return transactions.value.find(t => t.id === id)
  }

  const { updateRecurringDefinition, updateRecurringOccurrence, deleteRecurringOccurrence } =
    useRecurringActions(transactions, async () => {
      await fetch()
      void categoryStatsStore.fetchMonth()
    })

  return {
    transactions, uncategorizedTotal, loading, error, fetch, add, update, remove, toggleStatus,
    bulkRemove, bulkToggleStatus, bulkSetCategory, bulkImport,
    updateRecurringDefinition, updateRecurringOccurrence, deleteRecurringOccurrence, getById,
  }
})
