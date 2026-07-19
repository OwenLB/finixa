import type { SupabaseClient } from '@supabase/supabase-js'
import type { SubcategoryStat, CategorySpentStat, UncategorizedStat, TransactionType, VariableDailyRemaining } from '~/types'
import type { DashboardSummary } from '~/utils/dashboardSummary'

type DateRange = { start: string; end: string }

function rangeParams(dateRange?: DateRange): Record<string, unknown> {
  if (!dateRange) return {}
  return { p_start: dateRange.start, p_end: dateRange.end }
}

export async function fetchSubcategoryStats(
  client: SupabaseClient,
  month: string,
  dateRange?: DateRange,
): Promise<Map<string, SubcategoryStat>> {
  const { data, error } = await client.rpc('get_subcategory_stats', { p_month: month, ...rangeParams(dateRange) })
  if (error) throw new Error(error.message)
  return new Map(
    ((data ?? []) as { subcategory_id: string; spent: number; tx_count: number }[])
      .map(r => [r.subcategory_id, { spent: Number(r.spent), count: Number(r.tx_count) }])
  )
}

export async function fetchCategorySpentStats(
  client: SupabaseClient,
  month: string,
  dateRange?: DateRange,
): Promise<Map<string, CategorySpentStat>> {
  const { data, error } = await client.rpc('get_category_spent', { p_month: month, ...rangeParams(dateRange) })
  if (error) throw new Error(error.message)
  return new Map(
    ((data ?? []) as { category_id: string; total_spent: number; direct_spent: number; direct_count: number }[])
      .map(r => [r.category_id, {
        totalSpent:  Number(r.total_spent),
        directSpent: Number(r.direct_spent),
        directCount: Number(r.direct_count),
      }])
  )
}

export async function fetchEnvelopeStats(
  client: SupabaseClient,
  month: string,
  dateRange?: DateRange,
): Promise<Map<string, number>> {
  const { data, error } = await client.rpc('get_envelope_stats', { p_month: month, ...rangeParams(dateRange) })
  if (error) throw new Error(error.message)
  return new Map(
    ((data ?? []) as { envelope: string; spent: number }[])
      .map(r => [r.envelope, Number(r.spent)])
  )
}

export async function fetchUncategorizedStats(
  client: SupabaseClient,
  month: string,
  dateRange?: DateRange,
): Promise<Map<string, UncategorizedStat>> {
  const { data, error } = await client.rpc('get_uncategorized_stats', { p_month: month, ...rangeParams(dateRange) })
  if (error) throw new Error(error.message)
  return new Map(
    ((data ?? []) as { type: string; spent: number; tx_count: number }[])
      .map(r => [r.type as TransactionType, { spent: Number(r.spent), count: Number(r.tx_count) }])
  )
}

export async function fetchDashboardSummary(
  client: SupabaseClient,
  month: string,
  dateRange?: DateRange,
): Promise<DashboardSummary> {
  const { data, error } = await client.rpc('get_dashboard_summary', { p_month: month, ...rangeParams(dateRange) })
  if (error) throw new Error(error.message)

  type Row = {
    type: string
    spent_prev: number
    spent_excluded: number
    spent_reel: number
    solde_reel: number
    solde_prev: number
    budget: number
  }
  const rows = (data ?? []) as Row[]

  const spentByType    = new Map<TransactionType, number>()
  const excludedByType = new Map<TransactionType, number>()
  let spentReel = 0
  let soldeReel = 0
  let soldePrev = 0

  for (const r of rows) {
    spentByType.set(r.type as TransactionType, Number(r.spent_prev))
    excludedByType.set(r.type as TransactionType, Number(r.spent_excluded))
    if (r.type === 'depense') spentReel = Number(r.spent_reel)
    soldeReel += Number(r.solde_reel)
    soldePrev += Number(r.solde_prev)
  }

  return {
    spentByType,
    excludedByType,
    spentReel,
    spentPrev:  spentByType.get('depense') ?? 0,
    ringIncome: spentByType.get('revenu')  ?? 0,
    soldeReel,
    soldePrev,
  }
}

export async function fetchVariableDailyRemaining(
  client: SupabaseClient,
  month: string,
  dateRange?: DateRange,
): Promise<VariableDailyRemaining | null> {
  const { data, error } = await client.rpc('get_variable_daily_remaining', { p_month: month, ...rangeParams(dateRange) })
  if (error) throw new Error(error.message)
  const row = (data as { variable_budget: number; variable_spent: number; remaining: number; days_remaining: number; daily_remaining: number }[] | null)?.[0]
  if (!row) return null
  return {
    variableBudget: Number(row.variable_budget),
    variableSpent:  Number(row.variable_spent),
    remaining:      Number(row.remaining),
    daysRemaining:  Number(row.days_remaining),
    dailyRemaining: Number(row.daily_remaining),
  }
}
