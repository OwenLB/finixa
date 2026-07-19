import { useCategoryStore } from '~/stores/useCategoryStore'
import { useCategoryStatsStore } from '~/stores/useCategoryStatsStore'
import { usePeriodStore } from '~/stores/usePeriodStore'
import { useTransactionStore } from '~/stores/useTransactionStore'
import { variableBudgetAlert } from '~/utils/budgetAlert'
import { buildExcludedMatcher } from '~/utils/excludedCategories'

export type StatusLevel = 'ok' | 'moyen' | 'mauvais'
export type AlertLevel  = 'red' | 'orange'

export interface StatusAlert {
  categoryId:    string
  categoryName:  string
  categoryColor: string
  level:         AlertLevel
  spent:         number
  budget:        number
  isVariable:    boolean
}

export interface GoodCategory {
  categoryId:    string
  categoryName:  string
  categoryColor: string
  spent:         number
  budget:        number
}

export interface MissingRevenue {
  expected: number
  received: number
  gap:      number
}

export interface SavingsStatus {
  budget: number
  spent:  number
}


export function useMonthStatus() {
  const categoryStore      = useCategoryStore()
  const categoryStatsStore = useCategoryStatsStore()
  const periodStore        = usePeriodStore()
  const txStore            = useTransactionStore()

  // Catégories « exclues des calculs » (désépargne) — retirées des revenus perçus
  // et du score, mais conservées ailleurs.
  const isExcluded = computed(() => buildExcludedMatcher(categoryStore.categories))

  const progressRatio = computed(() => {
    const today    = new Date()
    const start    = new Date(periodStore.dateRange.start + 'T00:00:00')
    const end      = new Date(periodStore.dateRange.end   + 'T00:00:00')
    const totalMs  = end.getTime() - start.getTime()
    const passedMs = today.getTime() - start.getTime()
    return Math.max(0, Math.min(1, passedMs / totalMs))
  })

  const remainingDays = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end    = new Date(periodStore.dateRange.end + 'T00:00:00')
    const diffMs = end.getTime() - today.getTime()
    return Math.max(0, Math.ceil(diffMs / 86_400_000))
  })

  function alertLevel(spent: number, budget: number, isVariable: boolean): AlertLevel | null {
    if (progressRatio.value <= 0) return null
    if (isVariable) {
      const level = variableBudgetAlert(spent, budget, progressRatio.value)
      if (level === 'green' || level === null) return null
      return level
    }
    if (budget <= 0 || spent <= 0) return null
    if (spent > budget) return 'red'
    if (spent / budget > 0.90) return 'orange'
    return null
  }

  const alerts = computed<StatusAlert[]>(() => {
    const list: StatusAlert[] = []
    for (const cat of categoryStore.categories) {
      if (cat.type !== 'depense' || cat.totalBudget <= 0) continue
      const spent = categoryStatsStore.categorySpent.get(cat.id)?.totalSpent ?? 0
      const level = alertLevel(spent, cat.totalBudget, cat.isVariable)
      if (level) {
        list.push({
          categoryId:    cat.id,
          categoryName:  cat.name,
          categoryColor: cat.color,
          level,
          spent,
          budget:     cat.totalBudget,
          isVariable: cat.isVariable,
        })
      }
    }
    return list.sort((a, b) => (a.level === 'red' ? -1 : 1) - (b.level === 'red' ? -1 : 1))
  })

  const goodCategories = computed<GoodCategory[]>(() => {
    if (progressRatio.value <= 0) return []
    const list: GoodCategory[] = []
    for (const cat of categoryStore.categories) {
      if (cat.type !== 'depense' || cat.totalBudget <= 0) continue
      const spent = categoryStatsStore.categorySpent.get(cat.id)?.totalSpent ?? 0
      if (spent <= 0) continue
      const ratioBudget = spent / cat.totalBudget
      if (progressRatio.value - ratioBudget >= 0.20) {
        list.push({
          categoryId:    cat.id,
          categoryName:  cat.name,
          categoryColor: cat.color,
          spent,
          budget: cat.totalBudget,
        })
      }
    }
    return list.sort((a, b) => (b.budget - b.spent) - (a.budget - a.spent))
  })

  // Revenus attendus non encore perçus — uniquement après la moitié de la période
  // pour éviter les fausses alarmes en début de mois.
  const missingRevenue = computed<MissingRevenue | null>(() => {
    if (progressRatio.value < 0.5) return null
    const expected = categoryStore.budgetTotals.get('revenu') ?? 0
    if (expected <= 0) return null
    const received = txStore.transactions
      .filter(tx => !tx.horsBudget && tx.type === 'revenu' && tx.status === 'checked' && !tx.virtual && !isExcluded.value(tx))
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    const gap = expected - received
    if (gap / expected < 0.20) return null
    return { expected, received, gap }
  })

  // État de l'épargne du mois — calculé sans RPC :
  // budget = somme des sous-catégories épargne déjà en mémoire
  // spent  = transactions de type 'epargne' du mois courant
  const savingsStatus = computed<SavingsStatus | null>(() => {
    const epargneCategories = categoryStore.categories.filter(c => c.type === 'epargne')
    if (epargneCategories.length === 0) return null
    const budget = epargneCategories.reduce((sum, c) =>
      sum + c.subcategories.reduce((s, sub) => s + (sub.budget ?? 0), 0), 0
    )
    if (budget <= 0) return null
    const spent = txStore.transactions
      .filter(tx => !tx.horsBudget && tx.type === 'epargne' && !tx.virtual && !isExcluded.value(tx))
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    return { budget, spent }
  })

  const scoreBreakdown = computed(() => {
    // ── Dépenses (55 pts) ───────────────────────────────────────
    // Respect budget (35 pts) : pénalités par catégorie en alerte
    const reds    = alerts.value.filter(a => a.level === 'red').length
    const oranges = alerts.value.filter(a => a.level === 'orange').length
    const respectPts = Math.max(0, 35 - reds * 20 - oranges * 8)

    // Vélocité (20 pts) : rythme global de dépense vs temps écoulé
    let velocityPts = 10 // neutre si trop tôt dans le mois
    if (progressRatio.value >= 0.1) {
      const totalBudget = categoryStore.categories
        .filter(c => c.type === 'depense')
        .reduce((sum, c) => sum + c.totalBudget, 0)
      const totalSpent = txStore.transactions
        .filter(tx => !tx.horsBudget && tx.type === 'depense' && !tx.virtual && !isExcluded.value(tx))
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
      if (totalBudget > 0) {
        const pace = totalSpent / (totalBudget * progressRatio.value)
        if      (pace <= 0.80) velocityPts = 20
        else if (pace <= 1.00) velocityPts = 13
        else if (pace <= 1.15) velocityPts = 5
        else                   velocityPts = 0
      }
    }
    const depenses = respectPts + velocityPts

    // ── Revenus (10 pts) ────────────────────────────────────────
    const revBudget = categoryStore.budgetTotals.get('revenu') ?? 0
    let revenus = 10
    let revenusNa = false
    if (revBudget <= 0 || progressRatio.value < 0.5) {
      revenusNa = true
    } else {
      const received = txStore.transactions
        .filter(tx => !tx.horsBudget && tx.type === 'revenu' && tx.status === 'checked' && !tx.virtual && !isExcluded.value(tx))
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
      const gapRatio = (revBudget - received) / revBudget
      if      (gapRatio < 0.20) revenus = 10
      else if (gapRatio < 0.50) revenus = 5
      else                      revenus = 0
    }

    // ── Épargne (35 pts) ────────────────────────────────────────
    let epargne = 0
    const epargneNa = !savingsStatus.value
    if (savingsStatus.value) {
      const ratio = savingsStatus.value.spent / savingsStatus.value.budget
      if      (ratio >= 1)  epargne = 35
      else if (ratio >  0)  epargne = 18
    }

    return [
      { key: 'depenses', label: 'Budget & rythme', pts: depenses, max: 55, na: false,     neutral: false },
      { key: 'epargne',  label: 'Épargne',  pts: epargne,  max: 35, na: epargneNa, neutral: false },
      { key: 'revenus',  label: 'Revenus',  pts: revenus,  max: 10, na: false,     neutral: revenusNa },
    ] as const
  })

  const score = computed(() => scoreBreakdown.value.reduce((sum, p) => sum + p.pts, 0))

  const level = computed<StatusLevel>(() => {
    // Règle dure : budget global dépenses dépassé
    const depBudget = categoryStore.budgetTotals.get('depense') ?? 0
    if (depBudget > 0) {
      const totalSpent = categoryStore.categories
        .filter(c => c.type === 'depense')
        .reduce((sum, c) => sum + (categoryStatsStore.categorySpent.get(c.id)?.totalSpent ?? 0), 0)
      if (totalSpent > depBudget) return 'mauvais'
    }

    if (score.value >= 70) return 'ok'
    if (score.value >= 40) return 'moyen'
    return 'mauvais'
  })

  return { level, score, scoreBreakdown, alerts, goodCategories, missingRevenue, savingsStatus, progressRatio, remainingDays }
}
