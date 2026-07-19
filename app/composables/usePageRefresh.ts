/**
 * Même fetch que app.vue au chargement initial.
 * À utiliser comme callback du PullToRefresh sur chaque page.
 */
export function usePageRefresh() {
  const transactionStore   = useTransactionStore()
  const categoryStore      = useCategoryStore()
  const categoryStatsStore = useCategoryStatsStore()
  const envelopeStore      = useEnvelopeStore()
  const savingsGoalStore   = useSavingsGoalStore()

  async function refreshAll() {
    await Promise.all([
      transactionStore.fetch(),
      categoryStore.fetch(),
      categoryStatsStore.fetchMonth(),
      envelopeStore.fetch(),
      savingsGoalStore.fetch(),
    ])
  }

  return { refreshAll }
}
