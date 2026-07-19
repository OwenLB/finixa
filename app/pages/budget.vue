<template>
  <PullToRefresh :refresh="refreshAll">
  <div class="budget">
    <PageHeader :title="$t('nav.budget')" :show-date="false" />
    <PeriodSelector class="budget__period" />

    <!-- Chargement initial : évite le flash de "0 €" pendant le fetch -->
    <div v-if="categoryStore.loading && categoryStore.categories.length === 0" class="budget__loading">
      <UiAppSkeleton v-for="i in 4" :key="i" height="64px" border-radius="12px" />
    </div>

    <div v-else class="budget__content">
      <button class="budget__analyze" @click="analysisDrawer = true">
        <BarChart3 :size="14" />
        {{ $t('budgetAnalysis.cta') }}
      </button>
      <BudgetAnalysisDrawer v-model="analysisDrawer" />

      <!-- Mode gestion libre (feature désactivée) -->
      <template v-if="!envelopeEnabled">
        <CategoriesBudgetOverview />
        <CategoriesCategorySection type="revenu" />
        <CategoriesCategorySection type="depense" />
        <CategoriesCategorySection type="epargne" />
        <div class="budget__cagnottes">
          <SavingsGoalSection :show-add="true" />
        </div>
      </template>

      <!-- Mode enveloppes -->
      <template v-else>
        <!-- Résumé revenu -->
        <div class="budget__income-card">
          <span class="budget__income-label">{{ t('envelopes.monthlyIncome') }}</span>
          <span class="budget__income-value">{{ fmt(income) }}</span>
        </div>

        <!-- Enveloppes -->
        <div class="budget__envelopes" :class="{ 'budget__envelopes--stacked': isDesktop && panelOpen }">
          <BudgetEnvelopeCard
            v-for="env in envelopes"
            :key="env.key"
            :label="env.label"
            :color="env.color"
            :objective="env.objective"
            :allocated="env.allocated"
            :message="env.message"
            :status="env.status"
          />
        </div>

        <!-- Sous-catégories par enveloppe -->
        <div class="budget__sections">
          <CategoriesCategorySection type="revenu" />
          <CategoriesCategorySection type="depense" />
          <CategoriesCategorySection type="epargne" />
        </div>

        <div class="budget__cagnottes">
          <SavingsGoalSection :show-add="true" />
        </div>
      </template>
    </div>
  </div>
  </PullToRefresh>
</template>

<script setup lang="ts">
import PullToRefresh from '~/components/PullToRefresh.vue'
import PageHeader    from '~/components/PageHeader.vue'
import BudgetAnalysisDrawer from '~/components/budget/BudgetAnalysisDrawer.vue'
import { BarChart3 } from 'lucide-vue-next'
import { ENVELOPE_COLORS } from '~/stores/useEnvelopeStore'

const { t }          = useI18n()
const { isDesktop }  = useBreakpoint()
const { isOpen: panelOpen } = useRightPanel()
const prefsStore    = usePreferencesStore()
const envelopeStore = useEnvelopeStore()
const categoryStore = useCategoryStore()
const { fmt }       = useCurrency()
const { show }      = useToast()

const { refreshAll } = usePageRefresh()

const analysisDrawer = ref(false)

// Remonte les erreurs de chargement des budgets/enveloppes (avant : silencieuses)
watch(() => categoryStore.error ?? envelopeStore.error, (err) => {
  if (err) show(err, { type: 'error' })
})

const envelopeEnabled = computed(() => prefsStore.envelopeFeatureEnabled)
const income          = computed(() => categoryStore.budgetTotals.get('revenu') ?? 0)

type ConformityStatus = 'ok' | 'warning' | 'alert'

function getStatus(objective: number, spent: number): ConformityStatus {
  if (objective === 0) return 'ok'
  const diff = Math.abs(spent - objective) / objective * 100
  if (diff <= 5)  return 'ok'
  if (diff <= 10) return 'warning'
  return 'alert'
}

function getMessage(key: 'needs' | 'wants' | 'savings', objective: number, spent: number): string {
  if (objective === 0) return ''
  const diff   = spent - objective
  const pct    = Math.abs(diff) / objective * 100
  if (pct <= 5) return ''

  if (key === 'needs'   && diff > 0) return t('envelopes.messages.needsOver')
  if (key === 'wants'   && diff > 0) return t('envelopes.messages.wantsOver')
  if (key === 'savings' && diff < 0) return t('envelopes.messages.savingsLow')
  if (key === 'savings' && diff > 0) return t('envelopes.messages.savingsHigh')
  return ''
}

const envelopes = computed(() => {
  const envelopeKeys = ['needs', 'wants', 'savings'] as const
  const amounts      = envelopeStore.amountsFor(income.value)

  return envelopeKeys.map(key => {
    const objective = amounts[key]
    const allocated = categoryStore.budgetByEnvelope.get(key) ?? 0
    return {
      key,
      label:     t(`envelopes.${key}`),
      color:     ENVELOPE_COLORS[key],
      objective,
      allocated,
      status:    getStatus(objective, allocated),
      message:   getMessage(key, objective, allocated),
    }
  })
})
</script>

<style scoped lang="scss">
.budget {
  &__period  { padding: 0 $page-padding-x; }

  &__analyze {
    align-self: flex-end;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0 $page-padding-x;
    padding: 7px 12px;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--color-text-secondary);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-radius: 99px;
    transition: background $transition-fast, color $transition-fast;

    &:active { background: var(--color-bg-card); color: var(--color-text-primary); }

    @media (min-width: $breakpoint-lg) { margin: 0; }
  }

  &__loading {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px $page-padding-x 24px;

    @media (min-width: $breakpoint-lg) {
      max-width: 960px;
      margin: 0 auto;
      padding: 16px 24px 32px;
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 16px 0 24px;

    @media (min-width: $breakpoint-lg) {
      max-width: 960px;
      margin: 0 auto;
      padding: 16px 24px 32px;
    }
  }

  &__income-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0 $page-padding-x;
    padding: 14px 16px;
    background: var(--color-bg-card);
    border-radius: var(--radius-md);

    @media (min-width: $breakpoint-lg) { margin: 0; }
  }

  &__income-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  &__income-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__envelopes {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 $page-padding-x;

    @media (min-width: $breakpoint-lg) {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      padding: 0;
    }

    &--stacked {
      @media (min-width: $breakpoint-lg) {
        display: flex;
        flex-direction: column;
      }
    }
  }

  &__sections {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  &__cagnottes {
    padding: 0 $page-padding-x;

    @media (min-width: $breakpoint-lg) { padding: 0; }
  }
}
</style>
