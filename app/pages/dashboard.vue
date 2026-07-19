<template>
  <PullToRefresh :refresh="refreshAll">
  <div class="dashboard">
    <PageHeader title="Dashboard" :show-date="true" />

    <DashboardSkeleton v-if="categoryStatsStore.loading && !categoryStatsStore.dashboardSummary" />

    <div v-else class="dashboard__body">
      <section class="summary-card">
        <PeriodSelector />

        <h2 class="summary-card__heading">{{ $t('dashboard.monthlyExpenses') }}</h2>

        <!-- Mobile : carousel glissant entre les mois -->
        <template v-if="!isDesktop">
          <div
            class="carousel"
            @pointerdown="carouselDrag.onPointerDown"
            @pointermove="carouselDrag.onPointerMove"
            @pointerup="onCarouselPointerUp"
            @pointercancel="onCarouselCancel"
          >
            <div class="carousel__track" :style="carouselStyle">
              <div class="carousel__panel">
                <BudgetRing v-bind="ringProps(prevSummary)" instant />
                <CategoryBars :categories="catBars(prevSummary)" :view="view" instant />
              </div>
              <div class="carousel__panel">
                <BudgetRing v-bind="ringProps(currentSummary)" />
                <CategoryBars :categories="catBars(currentSummary)" :view="view" />
              </div>
              <div class="carousel__panel">
                <BudgetRing v-bind="ringProps(nextSummary)" instant />
                <CategoryBars :categories="catBars(nextSummary)" :view="view" instant />
              </div>
            </div>
          </div>
        </template>

        <!-- Desktop : statique, pas de carousel -->
        <template v-else>
          <BudgetRing
            :budget="ringIncome"
            :spent-reel="spentReel"
            :spent-prev="spentPrev"
            :solde-reel="soldeReel"
            :solde-prev="soldePrev"
          />
          <CategoryBars :categories="categoryBars" :view="view" />
        </template>

        <ViewToggle v-model="view" />
      </section>

      <!-- Statut du mois (mois courant uniquement ; le bilan mois passé n'est pas implémenté) -->
      <div v-if="isCurrentMonth" class="dashboard__month-status">
        <DashboardMonthStatusBlock />
      </div>

      <!-- Rangée 2 : alertes à gauche, récurrents à droite -->
      <DashboardAlerts />
      <div class="dashboard__recurring">
        <DashboardRecurringWidget />
      </div>

      <!-- Rangée 3 : cards catégories pleine largeur -->
      <section class="cat-section">
        <DashboardCategoryCards :view="view" />
      </section>

      <!-- Rangée 4 : reste à dépenser par jour (catégories variables) -->
      <LazyDashboardVariableDailyWidget />

      <!-- Rangée 5 : courbes côte à côte -->
      <div class="dashboard__charts">
        <InsightSpendingCurve :current="currentRemaining" :current-days="currentDays" :prev="prevRemaining" :prev-days="prevDays" :prev-label="prevLabel" />
        <InsightSpendingHistogram :current="currentDaily" />
      </div>
    </div>
  </div>
  </PullToRefresh>
</template>

<script setup lang="ts">
import PullToRefresh             from '~/components/PullToRefresh.vue'
import { useSwipe }              from '~/composables/useSwipe'
import { useHaptics }            from '~/composables/useHaptics'
import type { DashboardSummary } from '~/utils/dashboardSummary'
import DashboardMonthStatusBlock from '~/components/dashboard/MonthStatusBlock.vue'
import ViewToggle                from '~/components/dashboard/ViewToggle.vue'
import CategoryBars              from '~/components/dashboard/CategoryBars.vue'
import BudgetRing                from '~/components/dashboard/BudgetRing.vue'
import PageHeader                from '~/components/PageHeader.vue'
import PeriodSelector            from '~/components/PeriodSelector.vue'
import { useInsightData }        from '~/composables/useInsightData'
import { TYPE_COLOR, useCategoryStore } from '~/stores/useCategoryStore'
import { useCategoryStatsStore } from '~/stores/useCategoryStatsStore'
import { usePeriodStore }        from '~/stores/usePeriodStore'
import type { FinancialCategory, ViewMode, TransactionType } from '~/types'

const InsightSpendingCurve     = defineAsyncComponent(() => import('~/components/dashboard/InsightSpendingCurve.vue'))
const InsightSpendingHistogram = defineAsyncComponent(() => import('~/components/dashboard/InsightSpendingHistogram.vue'))

definePageMeta({ path: '/' })

const { t }              = useI18n()
const categoryStore      = useCategoryStore()
const categoryStatsStore   = useCategoryStatsStore()
const periodStore          = usePeriodStore()
const { show }             = useToast()

watch(() => categoryStore.error, (err) => {
  if (err) show(err, { type: 'error' })
})

const { refreshAll } = usePageRefresh()
const { isDesktop }  = useBreakpoint()

const haptics = useHaptics()

// ── Carousel ──────────────────────────────────────────────────────────
// Les 3 panneaux (mois précédent | mois courant | mois suivant) sont
// placés côte à côte dans un track 300% de large.
// Offset initial : -33.333% (panneau central visible).
const carouselDrag          = useSwipe({ threshold: 60, minDrag: 10 })
const carouselPhase         = ref<'idle' | 'commit' | 'snapback'>('idle')
const carouselTargetPercent = ref(-100 / 3)

const carouselStyle = computed(() => {
  if (carouselPhase.value === 'idle') {
    return {
      transform:  `translateX(calc(-33.333% + ${carouselDrag.deltaX.value}px))`,
      transition: 'none',
      willChange: 'transform',
    }
  }
  if (carouselPhase.value === 'commit') {
    return {
      transform:  `translateX(${carouselTargetPercent.value}%)`,
      transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
      willChange: 'transform',
    }
  }
  // snapback
  return {
    transform:  'translateX(-33.333%)',
    transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
    willChange: 'transform',
  }
})

function onCarouselPointerUp(e: PointerEvent) {
  if (carouselPhase.value !== 'idle') return
  const result = carouselDrag.onPointerUp(e)

  if (result === 'left' || result === 'right') {
    haptics.impact('light')
    carouselPhase.value         = 'commit'
    carouselTargetPercent.value = result === 'left' ? -(200 / 3) : 0
    setTimeout(async () => {
      if (result === 'left') periodStore.next()
      else                   periodStore.prev()
      // reset instantané (sans transition) avant de réactiver l'idle
      carouselTargetPercent.value = -100 / 3
      await nextTick()
      carouselPhase.value = 'idle'
      carouselDrag.reset()
    }, 320)
  } else if (result === null) {
    carouselPhase.value = 'snapback'
    setTimeout(() => {
      carouselPhase.value = 'idle'
      carouselDrag.reset()
    }, 280)
  } else {
    carouselDrag.reset()
  }
}

function onCarouselCancel() {
  carouselPhase.value = 'idle'
  carouselDrag.reset()
}

// Données pour les 3 panneaux
const carouselPrevKey = computed(() => addMonths(periodStore.month, -1))
const carouselNextKey = computed(() => addMonths(periodStore.month, +1))

const prevSummary    = computed(() => categoryStatsStore.getCachedSummary(carouselPrevKey.value))
const currentSummary = computed(() => categoryStatsStore.dashboardSummary)
const nextSummary    = computed(() => categoryStatsStore.getCachedSummary(carouselNextKey.value))

// Préchargement des mois adjacents
watchEffect(() => {
  categoryStatsStore.prefetchSummary(carouselPrevKey.value, periodStore.getDateRangeFor(carouselPrevKey.value))
  categoryStatsStore.prefetchSummary(carouselNextKey.value, periodStore.getDateRangeFor(carouselNextKey.value))
})

function ringProps(ds: DashboardSummary | null) {
  return {
    budget:    ds?.ringIncome ?? 0,
    spentReel: ds?.spentReel  ?? 0,
    spentPrev: ds?.spentPrev  ?? 0,
    soldeReel: ds?.soldeReel  ?? 0,
    soldePrev: ds?.soldePrev  ?? 0,
  }
}

function catBars(ds: DashboardSummary | null) {
  return TYPE_META.map(({ type, labelKey, color }) => ({
    label:          t(labelKey),
    color,
    amount:         ds?.spentByType.get(type)       ?? 0,
    budget:         categoryStore.budgetTotals.get(type) ?? 0,
    type,
    excludedAmount: ds?.excludedByType.get(type)    ?? 0,
  }))
}

const isCurrentMonth = computed(() => periodStore.month === periodStore.todayKey)

const view = ref<ViewMode>('depense')

const { currentDaily, currentRemaining, currentDays, prevRemaining, prevDays, prevKey } = useInsightData()

const prevLabel = computed(() => {
  const [y, m] = prevKey.value.split('-').map(Number)
  return new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
})

const TYPE_META = [
  { type: 'revenu'  as TransactionType, labelKey: 'types.revenu',  color: TYPE_COLOR.revenu  },
  { type: 'depense' as TransactionType, labelKey: 'types.depense', color: TYPE_COLOR.depense },
  { type: 'epargne' as TransactionType, labelKey: 'types.epargne', color: TYPE_COLOR.epargne },
] as const

// ── Agrégats dashboard depuis le RPC SQL (get_dashboard_summary) ──────────────
// Calculés en base, sans transmettre les lignes de transactions au client.
// Les catégories exclues (désépargne) sont isolées dans spent_excluded.
const ds = computed(() => categoryStatsStore.dashboardSummary)

const ringIncome = computed(() => ds.value?.ringIncome ?? 0)
const spentReel  = computed(() => ds.value?.spentReel  ?? 0)
const spentPrev  = computed(() => ds.value?.spentPrev  ?? 0)
const soldeReel  = computed(() => ds.value?.soldeReel  ?? 0)
const soldePrev  = computed(() => ds.value?.soldePrev  ?? 0)

const categoryBars = computed<FinancialCategory[]>(() =>
  TYPE_META.map(({ type, labelKey, color }) => ({
    label:          t(labelKey),
    color,
    amount:         ds.value?.spentByType.get(type)    ?? 0,
    budget:         categoryStore.budgetTotals.get(type) ?? 0,
    type,
    excludedAmount: ds.value?.excludedByType.get(type) ?? 0,
  }))
)
</script>

<style scoped lang="scss">
.dashboard {
  display: flex;
  flex-direction: column;
}

// ── Corps ──────────────────────────────────────────────────────
.dashboard__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: calc(24px + #{$tab-bar-height});

  @media (min-width: $breakpoint-lg) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "summary   summary"
      "mstatus   mstatus"
      "alerts    alerts"
      "recurring recurring"
      "cats      cats"
      "daily     daily"
      "charts    charts";
    gap: 20px 24px;
    padding: 0 24px 32px;
    align-items: start;
  }
}

// ── Carousel (mobile) ──────────────────────────────────────────
.carousel {
  overflow: hidden;
  touch-action: pan-y;

  &__track {
    display: flex;
    width: 300%;
  }

  &__panel {
    width: 33.333%;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
}

// ── Summary — pleine largeur ────────────────────────────────────
.summary-card {
  background: var(--color-bg-surface);
  padding: 20px $page-padding-x;
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (min-width: $breakpoint-lg) {
    grid-area: summary;
    border-radius: var(--radius-lg);
    // Horizontal sur desktop : donut à gauche, barres à droite
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto auto;
    grid-template-areas:
      "period  period"
      "heading heading"
      "ring    bars"
      "toggle  toggle";
    column-gap: 32px;
    row-gap: 16px;
  }

  &__heading {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    @media (min-width: $breakpoint-lg) { grid-area: heading; }
  }
}

// Repositionnement des enfants directs de summary-card sur desktop
:deep(.period-selector)        { @media (min-width: $breakpoint-lg) { grid-area: period; } }
:deep(.budget-ring)            { @media (min-width: $breakpoint-lg) { grid-area: ring; align-self: center; } }
:deep(.category-bars)          { @media (min-width: $breakpoint-lg) { grid-area: bars; align-self: center; } }
:deep(.view-toggle)            { @media (min-width: $breakpoint-lg) { grid-area: toggle; } }

// ── Month Status — pleine largeur ──────────────────────────────
.dashboard__month-status {
  padding: 0 $page-padding-x;
  @media (min-width: $breakpoint-lg) { grid-area: mstatus; padding: 0; }
}

// ── Alerts + Recurring — pleine largeur ────────────────────────
:deep(.dash-alerts)   { @media (min-width: $breakpoint-lg) { grid-area: alerts; } }
.dashboard__recurring { @media (min-width: $breakpoint-lg) { grid-area: recurring; } }

// ── CategoryCards — pleine largeur ─────────────────────────────
.cat-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  @media (min-width: $breakpoint-lg) { grid-area: cats; }
}

// ── Variable daily widget — pleine largeur ──────────────────────
:deep(.vdw) { @media (min-width: $breakpoint-lg) { grid-area: daily; } }

// ── Charts — 2 colonnes ────────────────────────────────────────
.dashboard__charts {
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (min-width: $breakpoint-lg) {
    grid-area: charts;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
}
</style>
