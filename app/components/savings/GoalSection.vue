<template>
  <section v-if="goals.length || showAdd" class="sgs">
    <div class="sgs__header">
      <span class="sgs__title">{{ $t('savingsGoals.sectionTitle') }}</span>
      </div>

    <div v-if="goals.length" class="sgs__list">
      <SavingsGoalCard
        v-for="goal in goals"
        :key="goal.id"
        :goal="goal"
        @click="onCardClick(goal)"
      />
    </div>

    <button v-if="showAdd" class="sgs__add-btn" @click="editDrawerOpen = true">
      <Plus :size="15" />
      {{ $t('savingsGoals.addBtn') }}
    </button>

    <!-- Drawer édition (budget) -->
    <SavingsGoalFormDrawer v-model="editDrawerOpen" :goal="editingGoal ?? undefined" />

    <!-- Drawer détail (dashboard) -->
    <AppDrawer v-model="detailDrawerOpen" :title="selectedGoal?.name ?? ''">
      <template v-if="selectedGoal">

        <!-- Chiffres clés -->
        <div class="sgs__kpi">
          <div class="sgs__kpi-item">
            <span class="sgs__kpi-label">{{ $t('savingsGoals.kpiSaved') }}</span>
            <span class="sgs__kpi-value" :style="{ color: selectedGoal.color }">{{ fmt(selectedGoal.currentAmount) }}</span>
          </div>
          <div class="sgs__kpi-sep" />
          <div class="sgs__kpi-item">
            <span class="sgs__kpi-label">{{ $t('savingsGoals.kpiRemaining') }}</span>
            <span class="sgs__kpi-value">{{ fmt(Math.max(0, remaining)) }}</span>
          </div>
          <div class="sgs__kpi-sep" />
          <div class="sgs__kpi-item">
            <span class="sgs__kpi-label">{{ $t('savingsGoals.kpiTarget') }}</span>
            <span class="sgs__kpi-value">{{ fmt(selectedGoal.targetAmount) }}</span>
          </div>
        </div>

        <!-- Graphique -->
        <SavingsGoalEvolutionChart :goal="selectedGoal" :monthly-rate="activeRate" />

        <!-- Progress bar -->
        <div class="sgs__progress">
          <div class="sgs__progress-header">
            <span class="sgs__progress-pct" :style="{ color: selectedGoal.color }">{{ pct }}%</span>
            <span class="sgs__progress-amounts">
              <span class="sgs__progress-current">{{ fmt(selectedGoal.currentAmount) }}</span>
              <span class="sgs__progress-target"> / {{ fmt(selectedGoal.targetAmount) }}</span>
            </span>
          </div>
          <UiBudgetProgressBar :value="selectedGoal.currentAmount" :max="selectedGoal.targetAmount" :color="selectedGoal.color" />
        </div>

        <!-- Détails & projection -->
        <div class="sgs__details">
          <div class="sgs__detail-row">
            <span class="sgs__detail-label">{{ monthlyBudget > 0 ? $t('savingsGoals.budgetLabel') : $t('savingsGoals.paceLabel') }}</span>
            <span class="sgs__detail-value">
              {{ activeRate > 0 ? fmt(activeRate) + $t('savingsGoals.perMonth') : '—' }}
            </span>
          </div>
          <div class="sgs__detail-sep" />
          <div class="sgs__detail-row">
            <span class="sgs__detail-label">{{ $t('savingsGoals.completionLabel') }}</span>
            <span class="sgs__detail-value" :style="activeRate > 0 && remaining > 0 ? { color: selectedGoal.color } : {}">
              {{ remaining <= 0 ? $t('savingsGoals.goalReachedShort') : activeRate > 0 ? activeCompletion : '—' }}
            </span>
          </div>
        </div>

      </template>
    </AppDrawer>
  </section>
</template>

<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { useSavingsGoalStore } from '~/stores/useSavingsGoalStore'
import { useCategoryStore }    from '~/stores/useCategoryStore'
import type { SavingsGoal } from '~/types'

const props = defineProps<{ showAdd?: boolean; detailMode?: boolean }>()

const store         = useSavingsGoalStore()
const categoryStore = useCategoryStore()
const { fmt }       = useCurrency()
const { t }         = useI18n()
const goals         = computed(() => store.goals)

const editDrawerOpen   = ref(false)
const detailDrawerOpen = ref(false)
const editingGoal      = ref<SavingsGoal | null>(null)
const selectedGoal     = ref<SavingsGoal | null>(null)

function onCardClick(goal: SavingsGoal) {
  if (props.detailMode) {
    selectedGoal.value     = goal
    detailDrawerOpen.value = true
  } else {
    editingGoal.value    = goal
    editDrawerOpen.value = true
  }
}

watch(editDrawerOpen,   (val) => { if (!val) editingGoal.value  = null })
watch(detailDrawerOpen, (val) => { if (!val) selectedGoal.value = null })

// Budget mensuel de la sous-catégorie liée
// Cherche d'abord par ID, puis par nom (l'ID peut changer quand le budget est modifié)
const monthlyBudget = computed(() => {
  if (!selectedGoal.value) return 0
  for (const cat of categoryStore.categories) {
    const byId = cat.subcategories.find(s => s.id === selectedGoal.value!.subcategoryId)
    if (byId) return byId.budget ?? 0
  }
  for (const cat of categoryStore.categories) {
    const byName = cat.subcategories.find(s => s.name === selectedGoal.value!.name)
    if (byName) return byName.budget ?? 0
  }
  return 0
})

const remaining = computed(() =>
  Math.max(0, (selectedGoal.value?.targetAmount ?? 0) - (selectedGoal.value?.currentAmount ?? 0))
)

const pct = computed(() => {
  const g = selectedGoal.value
  if (!g || g.targetAmount <= 0) return 0
  return Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
})

function monthsToText(months: number): string {
  if (months <= 1) return t('savingsGoals.completionMonth', 1)
  if (months < 12) return t('savingsGoals.completionMonth', months, { named: { n: months } })
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  const monthKey = String(d.getMonth() + 1)
  return `${t(`savingsGoals.monthsFull.${monthKey}`)} ${d.getFullYear()}`
}

// Mois écoulés depuis la création (min 1 pour éviter div/0)
const monthsElapsed = computed(() => {
  if (!selectedGoal.value) return 1
  const start = new Date(selectedGoal.value.createdAt)
  const now   = new Date()
  const m = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  return Math.max(m, 1)
})

// Rythme d'épargne réel par mois
const actualPace = computed(() => {
  if (!selectedGoal.value) return 0
  const saved = selectedGoal.value.currentAmount - selectedGoal.value.startAmount
  if (saved <= 0) return 0
  return saved / monthsElapsed.value
})

// Budget prévu en priorité, sinon rythme réel
const activeRate       = computed(() => monthlyBudget.value > 0 ? monthlyBudget.value : actualPace.value)
const activeCompletion = computed(() => activeRate.value > 0 ? monthsToText(Math.ceil(remaining.value / activeRate.value)) : '—')
</script>

<style scoped lang="scss">
.sgs {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #14b8a6;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__kpi {
    display: flex;
    align-items: center;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: 14px 0;
  }

  &__kpi-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  &__kpi-sep {
    width: 1px;
    height: 32px;
    background: var(--color-border-subtle);
    flex-shrink: 0;
  }

  &__kpi-label {
    font-size: 11px;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  &__kpi-value {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__progress {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__progress-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  &__progress-pct {
    font-size: 15px;
    font-weight: 700;
  }

  &__progress-amounts {
    font-size: 13px;
  }

  &__progress-current {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__progress-target {
    color: var(--color-text-muted);
  }

  &__details {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: 4px 0;
  }

  &__detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
  }

  &__detail-label {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  &__detail-value {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__detail-sep {
    height: 1px;
    background: var(--color-border-subtle);
    margin: 4px 16px;
  }

  &__add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-muted);
    transition: border-color $transition-fast, color $transition-fast;

    &:hover {
      border-color: var(--color-text-muted);
      color: var(--color-text-primary);
    }
  }
}
</style>
