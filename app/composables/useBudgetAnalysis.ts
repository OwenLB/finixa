import { ref, computed } from 'vue'
import { useCategoryStore } from '~/stores/useCategoryStore'
import { usePeriodStore } from '~/stores/usePeriodStore'
import { usePreferencesStore } from '~/stores/usePreferencesStore'
import { fetchSubcategoryStats } from '~/services/categoryStatsService'
import { addMonths, getPeriodBounds } from '~/utils/period'
import { buildAnalysisRows, type BudgetAnalysisRow } from '~/utils/budgetAnalysis'

export type AnalysisWindow = 3 | 6 | 12

export function useBudgetAnalysis() {
  const categoryStore = useCategoryStore()
  const periodStore   = usePeriodStore()
  const prefsStore    = usePreferencesStore()
  const supabase      = useSupabaseClient()

  const months      = ref<AnalysisWindow>(6)
  const loading     = ref(false)
  const error       = ref<string | null>(null)
  const activeMonths = ref(0)
  const applyingId  = ref<string | null>(null)
  const applyingAll = ref(false)

  // total réel dépensé par sous-catégorie sur la fenêtre
  const totals = ref(new Map<string, number>())

  const rows = computed<BudgetAnalysisRow[]>(() =>
    buildAnalysisRows(categoryStore.categories, totals.value, activeMonths.value),
  )

  const adjustableCount = computed(() => rows.value.filter(r => r.delta !== 0).length)

  async function run() {
    loading.value = true
    error.value   = null
    try {
      const startDay = prefsStore.periodStartDay ?? 1
      // N mois complets précédents (on exclut la période en cours, incomplète)
      const keys = Array.from({ length: months.value }, (_, i) =>
        addMonths(periodStore.todayKey, -(i + 1)),
      )

      const results = await Promise.all(
        keys.map(key => fetchSubcategoryStats(supabase, key, getPeriodBounds(startDay, key))),
      )

      const agg = new Map<string, number>()
      let active = 0
      for (const monthStats of results) {
        let monthTotal = 0
        for (const [subId, stat] of monthStats) {
          agg.set(subId, (agg.get(subId) ?? 0) + stat.spent)
          monthTotal += stat.spent
        }
        if (monthTotal > 0) active++
      }

      totals.value       = agg
      activeMonths.value = active
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de l\'analyse'
    } finally {
      loading.value = false
    }
  }

  function setWindow(w: AnalysisWindow) {
    if (w === months.value) return
    months.value = w
    void run()
  }

  async function applyRow(row: BudgetAnalysisRow) {
    applyingId.value = row.subId
    try {
      await categoryStore.updateSubcategory(row.categoryId, row.subId, row.name, row.suggested)
    } finally {
      applyingId.value = null
    }
  }

  async function applyAll() {
    applyingAll.value = true
    try {
      for (const row of rows.value) {
        if (row.delta === 0) continue
        await categoryStore.updateSubcategory(row.categoryId, row.subId, row.name, row.suggested)
      }
    } finally {
      applyingAll.value = false
    }
  }

  return {
    months,
    loading,
    error,
    activeMonths,
    applyingId,
    applyingAll,
    rows,
    adjustableCount,
    run,
    setWindow,
    applyRow,
    applyAll,
  }
}
