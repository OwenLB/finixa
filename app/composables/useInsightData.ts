import { useTransactionStore } from '~/stores/useTransactionStore'
import { usePeriodStore } from '~/stores/usePeriodStore'

export interface DailyPoint { x: number; y: number }

function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function toPrevKey(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function buildDailySpending(
  txs: { date: string; amount: number; type: string }[],
  ym: string,
): number[] {
  const days = daysInMonth(ym)
  const totals = Array<number>(days).fill(0)
  for (const t of txs) {
    if (t.type !== 'depense') continue
    const day = parseInt(t.date.slice(8, 10), 10) - 1
    if (day >= 0 && day < days) totals[day] += Math.abs(t.amount)
  }
  return totals
}

// Solde cumulé jour par jour.
// Si un jour contient à la fois des revenus et des dépenses,
// on émet deux points au même X : le pic après revenus, puis le net en fin de journée.
function buildDailyRemaining(
  txs: { date: string; amount: number; type: string }[],
  ym: string,
): DailyPoint[] {
  const days = daysInMonth(ym)

  // Pré-bucket en O(n) : une seule passe sur les transactions
  const byDay: Array<{ rev: number; out: number }> = Array.from({ length: days }, () => ({ rev: 0, out: 0 }))
  for (const t of txs) {
    const day = parseInt(t.date.slice(8, 10), 10) - 1
    if (day < 0 || day >= days) continue
    if (t.type === 'revenu') byDay[day]!.rev += t.amount
    else byDay[day]!.out += t.amount
  }

  const result: DailyPoint[] = []
  let running = 0
  for (let d = 0; d < days; d++) {
    const { rev, out } = byDay[d]!
    if (rev > 0 && out < 0) result.push({ x: d, y: running + rev })
    running += rev + out
    result.push({ x: d, y: running })
  }
  return result
}

export function useInsightData() {
  const txStore     = useTransactionStore()
  const periodStore = usePeriodStore()
  const supabase    = useSupabaseClient()

  const prevKey  = computed(() => toPrevKey(periodStore.month))
  const prevData = ref<{ date: string; amount: number; type: string }[]>([])

  const currentDaily     = computed(() => buildDailySpending(txStore.transactions, periodStore.month))
  const currentRemaining = computed(() => buildDailyRemaining(txStore.transactions, periodStore.month))
  const currentDays      = computed(() => daysInMonth(periodStore.month))
  const prevRemaining    = computed(() => buildDailyRemaining(prevData.value, prevKey.value))
  const prevDays         = computed(() => daysInMonth(prevKey.value))

  let loadSeq   = 0
  let loadTimer: ReturnType<typeof setTimeout> | null = null

  async function loadPrev() {
    const seq = ++loadSeq
    const { data } = await supabase
      .from('transactions')
      .select('date, amount, type')
      .gte('date', `${prevKey.value}-01`)
      .lt('date', `${periodStore.month}-01`)
    if (seq !== loadSeq) return
    prevData.value = (data ?? []) as { date: string; amount: number; type: string }[]
  }

  function debouncedLoadPrev() {
    if (loadTimer) clearTimeout(loadTimer)
    loadTimer = setTimeout(loadPrev, 250)
  }

  watch(() => periodStore.month, debouncedLoadPrev, { immediate: true })

  return {
    currentDaily,
    currentRemaining,
    currentDays,
    prevRemaining,
    prevDays,
    prevKey,
    prevData,
  }
}
