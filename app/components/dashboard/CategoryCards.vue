<template>
  <div class="cat-cards">
    <template v-for="group in groupedCategories" :key="group.type">
      <div v-if="group.items.length" class="cat-cards__section">

        <div class="cat-cards__section-header">
          <button
            class="cat-cards__section-title"
            :style="{ color: TYPE_COLOR[group.type] }"
            :disabled="!typesWithData.has(group.type)"
            @click="openTypeDrawer(group.type)"
          >
            {{ $t(`types.${group.type}`).toUpperCase() }}
            <ChevronRight v-if="typesWithData.has(group.type)" :size="11" />
          </button>
        </div>

        <div class="cat-cards__grid">
          <div v-for="cat in group.items" :key="cat.id" class="cat-cards__item">
            <div class="cat-cards__item-header">
              <div class="cat-cards__icon" :style="{ background: catColor(cat) + '22' }">
                <component :is="getIcon(cat.iconKey)" :size="13" :style="{ color: catColor(cat) }" />
              </div>
              <span class="cat-cards__name">{{ cat.name }}</span>
              <span v-if="cat.excluded" class="cat-cards__excluded-badge">{{ $t('dashboard.excludedBadge') }}</span>
              <span
                v-if="variableAlert(cat)"
                class="cat-cards__alert-dot"
                :style="{ background: ALERT_COLOR[variableAlert(cat)!] }"
              />
            </div>

            <UiBudgetProgressBar
              v-if="cat.budget > 0"
              :value="props.view === 'depense' ? cat.spent - cat.excludedSpent : cat.budget - cat.spent"
              :max="cat.budget"
              :color="catColor(cat)"
              :excess-color="cat.type === 'depense' ? undefined : darkenHex(catColor(cat))"
              :extra="cat.excludedSpent"
              :reverse="props.view === 'restant'"
            />

            <div class="cat-cards__divider" />

            <button class="cat-cards__footer" @click="openDetail(cat)">
              <div class="cat-cards__amounts">
                <span class="cat-cards__spent" :style="cat.excluded ? { color: EXCLUDED_COLOR } : {}">{{ fmt(cat.spent) }}</span>
                <span v-if="cat.budget > 0" class="cat-cards__budget">/ {{ fmt(cat.budget) }}</span>
              </div>
              <ChevronRight :size="13" class="cat-cards__chevron" />
            </button>
          </div>

          <div v-if="typeOnlyTotals.get(group.type)" class="cat-cards__item cat-cards__item--type-only">
            <div class="cat-cards__item-header">
              <span class="cat-cards__name">
                {{ $t('dashboard.uncategorized') }}
                <span class="cat-cards__uncat-count">({{ typeOnlyCounts.get(group.type) }})</span>
              </span>
            </div>
            <button class="cat-cards__footer" @click="goToUncategorized(group.type)">
              <span class="cat-cards__spent">{{ fmt(typeOnlyTotals.get(group.type)!) }}</span>
              <ChevronRight :size="13" class="cat-cards__chevron" />
            </button>
          </div>
        </div>

      </div>
    </template>

    <div v-if="goalStore.goals.length" class="cat-cards__section">
      <SavingsGoalSection detail-mode />
    </div>
  </div>

  <DashboardCategoryTypeDrawer
    v-model="typeDrawerOpen"
    :type="selectedType"
    :breakdown="typeBreakdown"
  />

  <DashboardCategoryDetailDrawer
    v-model="drawerOpen"
    :cat="selectedCat"
    @go-to-category="goToCategory"
    @go-to-subcategory="goToSubcategory"
  />
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { useCategoryStore }      from '~/stores/useCategoryStore'
import { useCategoryStatsStore } from '~/stores/useCategoryStatsStore'
import { useTransactionStore }   from '~/stores/useTransactionStore'
import { useFilterStore }        from '~/stores/useFilterStore'
import { useSavingsGoalStore }   from '~/stores/useSavingsGoalStore'
import { usePeriodStore }        from '~/stores/usePeriodStore'
import { getIcon }               from '~/utils/iconRegistry'
import { darkenHex }             from '~/utils/colorUtils'
import { variableBudgetAlert }   from '~/utils/budgetAlert'
import type { BudgetAlertLevel } from '~/utils/budgetAlert'
import type { TransactionType, ViewMode } from '~/types'
import type { EnrichedCategory, EnrichedSub, TypeBreakdown } from '~/types/dashboard'

const props = defineProps<{ view: ViewMode }>()

const TYPE_ORDER: TransactionType[] = ['depense', 'epargne', 'revenu']

const TYPE_COLOR: Record<TransactionType, string> = {
  revenu:  '#22c55e',
  depense: '#ef4444',
  epargne: '#3b82f6',
}

// Catégorie « exclue des calculs » (désépargne) → affichée en rouge
const EXCLUDED_COLOR = '#ef4444'
function catColor(cat: EnrichedCategory): string {
  return cat.excluded ? EXCLUDED_COLOR : cat.color
}

const categoryStore      = useCategoryStore()
const categoryStatsStore = useCategoryStatsStore()
const txStore            = useTransactionStore()
const filterStore        = useFilterStore()
const goalStore          = useSavingsGoalStore()
const periodStore        = usePeriodStore()
const { t }              = useI18n()
const { fmt }            = useCurrency()

const progressRatio = computed(() => {
  const today    = new Date()
  const start    = new Date(periodStore.dateRange.start + 'T00:00:00')
  const end      = new Date(periodStore.dateRange.end   + 'T00:00:00')
  const totalMs  = end.getTime() - start.getTime()
  const passedMs = today.getTime() - start.getTime()
  return Math.max(0, Math.min(1, passedMs / totalMs))
})

// ── Navigation ────────────────────────────────────────────────────────────────

function goToUncategorized(type: TransactionType) {
  filterStore.reset()
  filterStore.types.push(type)
  filterStore.uncategorized = true
  navigateTo('/transactions')
}

function goToCategory(cat: EnrichedCategory) {
  filterStore.reset()
  filterStore.categories.push(cat.name)
  drawerOpen.value = false
  navigateTo('/transactions')
}

function goToSubcategory(sub: EnrichedSub, cat: EnrichedCategory) {
  filterStore.reset()
  if (sub.id === '__other__') {
    filterStore.categories.push(cat.name)
    filterStore.uncategorized = true
  } else {
    filterStore.subcategories.push(sub.name)
  }
  drawerOpen.value = false
  navigateTo('/transactions')
}

// ── Enriched data ─────────────────────────────────────────────────────────────

const enrichedCategories = computed<EnrichedCategory[]>(() =>
  categoryStore.categories.map(cat => {
    const catStats = categoryStatsStore.categorySpent.get(cat.id)

    const enrichedSubs = cat.subcategories.map(sub => {
      const subStats = categoryStatsStore.subcategoryStats.get(sub.id)
      return { ...sub, spent: subStats?.spent ?? 0, count: subStats?.count ?? 0 }
    })

    const directSpent = catStats?.directSpent ?? 0
    const directCount = catStats?.directCount ?? 0

    const allSubs: EnrichedSub[] = [
      ...enrichedSubs,
      ...(directSpent > 0 ? [{ id: '__other__', name: t('dashboard.uncategorized'), budget: 0, spent: directSpent, count: directCount }] : []),
    ]

    const spent = catStats?.totalSpent ?? 0
    // Part exclue (désépargne) : soit la catégorie entière est exclue, soit
    // certaines de ses sous-catégories le sont (segment rouge dans la barre).
    const excludedSpent = cat.excluded
      ? spent
      : enrichedSubs.filter(s => s.excluded).reduce((sum, s) => sum + s.spent, 0)

    return {
      id:            cat.id,
      name:          cat.name,
      type:          cat.type,
      iconKey:       cat.iconKey,
      color:         cat.color,
      isVariable:    cat.isVariable,
      excluded:      cat.excluded,
      budget:        cat.totalBudget,
      spent,
      excludedSpent,
      subcategories: allSubs,
    }
  })
)

const groupedCategories = computed(() =>
  TYPE_ORDER.map(type => ({
    type,
    items: enrichedCategories.value.filter(c => c.type === type && (c.budget > 0 || c.spent > 0)),
  }))
)

const typeOnlyTotals = computed(() =>
  new Map([...categoryStatsStore.uncategorized.entries()].map(([type, s]) => [type, s.spent]))
)

const typeOnlyCounts = computed(() =>
  new Map([...categoryStatsStore.uncategorized.entries()].map(([type, s]) => [type, s.count]))
)

// ── Type drawer ───────────────────────────────────────────────────────────────

const typeDrawerOpen = ref(false)
const selectedType   = ref<TransactionType | null>(null)

const typesWithData = computed(() =>
  new Set(enrichedCategories.value.filter(c => c.spent > 0).map(c => c.type))
)

function openTypeDrawer(type: TransactionType) {
  if (!typesWithData.value.has(type)) return
  selectedType.value   = type
  typeDrawerOpen.value = true
}

watch(typeDrawerOpen, v => { if (!v) selectedType.value = null })

const typeBreakdown = computed<TypeBreakdown>(() => {
  if (!selectedType.value) return { segments: [], total: 0 }
  const type  = selectedType.value
  const total = txStore.transactions
    .filter(tx => tx.type === type)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const cats = enrichedCategories.value.filter(c => c.type === type && c.spent > 0)
  return {
    total,
    segments: cats.map(c => ({ name: c.name, color: c.color, value: c.spent })),
  }
})

// ── Detail drawer ─────────────────────────────────────────────────────────────

const drawerOpen  = ref(false)
const selectedCat = ref<EnrichedCategory | null>(null)

function openDetail(cat: EnrichedCategory) {
  selectedCat.value = cat
  drawerOpen.value  = true
}

watch(drawerOpen, v => { if (!v) selectedCat.value = null })

// ── Alertes catégories variables ──────────────────────────────────────────

function variableAlert(cat: EnrichedCategory): BudgetAlertLevel | null {
  if (!cat.isVariable) return null
  return variableBudgetAlert(cat.spent, cat.budget, progressRatio.value)
}

const ALERT_COLOR: Record<BudgetAlertLevel, string> = {
  green:  '#22c55e',
  orange: '#f97316',
  red:    '#ef4444',
}
</script>

<style scoped lang="scss">
.cat-cards {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0 $page-padding-x;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__section-header { padding: 0 2px; }

  &__section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  &__item {
    background: var(--color-bg-card);
    border-radius: var(--radius-md);
    padding: 12px 12px 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__item-header {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__divider {
    height: 1px;
    background: var(--color-border);
    margin: 0 -12px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0px 0 10px;
    width: 100%;
    transition: opacity $transition-fast;

    &:active { opacity: 0.6; }
  }

  &__amounts {
    display: flex;
    align-items: baseline;
    gap: 3px;
  }

  &__spent {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__budget {
    font-size: 11px;
    color: var(--color-text-muted);
  }

  &__chevron { color: var(--color-text-muted); }

  &__alert-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-left: auto;
  }

  &__uncat-count {
    font-size: 10px;
    font-weight: 400;
    color: var(--color-text-muted);
  }

  &__excluded-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #ef4444;
    background: #ef444422;
    border-radius: 4px;
    padding: 1px 5px;
    flex-shrink: 0;
  }
}
</style>
