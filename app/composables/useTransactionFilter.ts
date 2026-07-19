import { useTransactionStore } from '~/stores/useTransactionStore'
import { useCategoryStore }    from '~/stores/useCategoryStore'
import { useFilterStore }      from '~/stores/useFilterStore'
import { groupByDate }         from '~/utils/groupByDate'
import { buildCategoryFilter } from '~/utils/transactionFilter'

export function useTransactionFilter(search: Ref<string>) {
  const { t, locale }  = useI18n()
  const store          = useTransactionStore()
  const categoryStore  = useCategoryStore()
  const filterStore    = useFilterStore()

  // ── Chained computeds — each layer only reruns when its inputs change ────────

  const withText = computed(() => {
    if (!search.value) return store.transactions
    const q = search.value.toLowerCase()
    return store.transactions.filter(tx =>
      tx.name.toLowerCase().includes(q) || tx.category.toLowerCase().includes(q)
    )
  })

  const withType = computed(() =>
    filterStore.types.length
      ? withText.value.filter(tx => filterStore.types.includes(tx.type))
      : withText.value
  )

  const withCategory = computed(() => {
    if (!filterStore.categories.length && !filterStore.subcategories.length) return withType.value
    const matches = buildCategoryFilter(
      categoryStore.categories,
      filterStore.categories,
      filterStore.subcategories,
    )
    return withType.value.filter(matches)
  })

  const withStatus = computed(() =>
    filterStore.status
      ? withCategory.value.filter(tx => tx.status === filterStore.status)
      : withCategory.value
  )

  const withUncategorized = computed(() =>
    filterStore.uncategorized
      ? withStatus.value.filter(tx =>
          !tx.categorized
          || (!categoryStore.allSubcategoryNames.has(tx.category) && !categoryStore.allSubcategoryIds.has(tx.category))
        )
      : withStatus.value
  )

  const withRecurring = computed(() =>
    filterStore.recurring !== null
      ? withUncategorized.value.filter(tx => !!tx.virtual === filterStore.recurring)
      : withUncategorized.value
  )

  const filteredGroups = computed(() => {
    const labels = { today: t('date.today'), yesterday: t('date.yesterday'), locale: locale.value }
    return groupByDate(withRecurring.value, labels)
  })

  const filteredIds = computed(() => withRecurring.value.map(tx => tx.id))

  return { filteredGroups, filteredIds }
}
