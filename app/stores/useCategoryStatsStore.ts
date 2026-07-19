import { defineStore } from 'pinia'
import type { SubcategoryStat, CategorySpentStat, UncategorizedStat, VariableDailyRemaining } from '~/types'
import type { DashboardSummary } from '~/utils/dashboardSummary'
import {
  fetchSubcategoryStats,
  fetchCategorySpentStats,
  fetchUncategorizedStats,
  fetchEnvelopeStats,
  fetchVariableDailyRemaining,
  fetchDashboardSummary,
} from '~/services/categoryStatsService'
import { usePeriodStore } from '~/stores/usePeriodStore'

export const useCategoryStatsStore = defineStore('categoryStats', () => {
  const supabase    = useSupabaseClient()
  const periodStore = usePeriodStore()
  const user        = useSupabaseUser()

  const subcategoryStats       = ref(new Map<string, SubcategoryStat>())
  const categorySpent          = ref(new Map<string, CategorySpentStat>())
  const uncategorized          = ref(new Map<string, UncategorizedStat>())
  const envelopeSpent          = ref(new Map<string, number>())
  const variableDailyRemaining = ref<VariableDailyRemaining | null>(null)
  const dashboardSummary       = ref<DashboardSummary | null>(null)
  const loading                = ref(false)
  const error                  = ref<string | null>(null)

  const summaryCache = ref(new Map<string, DashboardSummary>())

  let fetchSeq   = 0
  let fetchTimer: ReturnType<typeof setTimeout> | null = null

  async function fetchMonth() {
    if (!user.value) return
    const seq = ++fetchSeq
    loading.value = true
    error.value   = null
    try {
      const range = periodStore.dateRange
      const [subStats, catStats, uncatStats, envStats, varDaily, ds] = await Promise.all([
        fetchSubcategoryStats(supabase, periodStore.month, range),
        fetchCategorySpentStats(supabase, periodStore.month, range),
        fetchUncategorizedStats(supabase, periodStore.month, range),
        fetchEnvelopeStats(supabase, periodStore.month, range),
        fetchVariableDailyRemaining(supabase, periodStore.month, range),
        fetchDashboardSummary(supabase, periodStore.month, range),
      ])
      if (seq !== fetchSeq) return
      subcategoryStats.value       = subStats
      categorySpent.value          = catStats
      uncategorized.value          = uncatStats
      envelopeSpent.value          = envStats
      variableDailyRemaining.value = varDaily
      dashboardSummary.value       = ds
      const cache = new Map(summaryCache.value)
      cache.set(periodStore.month, ds)
      summaryCache.value = cache
    } catch (e) {
      if (seq === fetchSeq) {
        error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des statistiques'
      }
    } finally {
      if (seq === fetchSeq) loading.value = false
    }
  }

  // Mise à jour instantanée depuis le cache quand le mois change (évite le blanc pendant le fetch)
  watch(() => periodStore.month, (newMonth) => {
    const cached = summaryCache.value.get(newMonth)
    if (cached) dashboardSummary.value = cached
  })

  async function prefetchSummary(monthKey: string, range: { start: string; end: string }) {
    if (summaryCache.value.has(monthKey) || !user.value) return
    try {
      const ds = await fetchDashboardSummary(supabase, monthKey, range)
      const cache = new Map(summaryCache.value)
      cache.set(monthKey, ds)
      summaryCache.value = cache
    } catch {
      // best-effort, échec silencieux
    }
  }

  function getCachedSummary(monthKey: string): DashboardSummary | null {
    return summaryCache.value.get(monthKey) ?? null
  }

  function debouncedFetchMonth() {
    if (fetchTimer) clearTimeout(fetchTimer)
    fetchTimer = setTimeout(fetchMonth, 250)
  }

  watch(() => `${periodStore.dateRange.start}|${periodStore.dateRange.end}`, debouncedFetchMonth)

  return { subcategoryStats, categorySpent, uncategorized, envelopeSpent, variableDailyRemaining, dashboardSummary, loading, error, fetchMonth, prefetchSummary, getCachedSummary }
})
