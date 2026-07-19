<template>
  <div v-if="show" class="vdw">
    <div class="vdw__inner">
      <div class="vdw__icon-col">
        <Wallet2 :size="18" class="vdw__icon" />
      </div>
      <div class="vdw__content">
        <div class="vdw__main">
          <span v-if="overBudget" class="vdw__amount vdw__amount--over">
            Budget dépassé
          </span>
          <span v-else class="vdw__amount">
            {{ fmt(data?.dailyRemaining ?? 0) }}<span class="vdw__per-day">&nbsp;/ jour</span>
          </span>
        </div>
        <p class="vdw__subtitle">
          Reste à dépenser d'ici le {{ endOfMonthLabel }}
        </p>
      </div>
      <div v-if="!overBudget" class="vdw__mini-stat">
        <span class="vdw__mini-remaining">{{ fmt(data?.remaining ?? 0) }}</span>
        <span class="vdw__mini-label">restants</span>
      </div>
    </div>

    <div class="vdw__bar-track">
      <div
        class="vdw__bar-fill"
        :class="{ 'vdw__bar-fill--over': overBudget }"
        :style="{ width: barWidth + '%' }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Wallet2 } from 'lucide-vue-next'
import { useCategoryStatsStore } from '~/stores/useCategoryStatsStore'
import { usePeriodStore }         from '~/stores/usePeriodStore'
import { currentMonthKey }        from '~/utils/period'

const statsStore  = useCategoryStatsStore()
const periodStore = usePeriodStore()
const { fmt }     = useCurrency()

const data = computed(() => statsStore.variableDailyRemaining)

// Afficher uniquement pour le mois courant et si un budget variable est défini
const show = computed(() =>
  !!data.value
  && data.value.variableBudget > 0
  && periodStore.month === currentMonthKey()
)

const overBudget = computed(() => !!data.value && data.value.remaining < 0)

const barWidth = computed(() => {
  if (!data.value || data.value.variableBudget <= 0) return 0
  const pct = (data.value.variableSpent / data.value.variableBudget) * 100
  return Math.min(pct, 100)
})

const endOfMonthLabel = computed(() => {
  const [y, m] = periodStore.month.split('-').map(Number)
  const lastDay = new Date(y, m, 0)
  return lastDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
})
</script>

<style scoped lang="scss">
.vdw {
  margin: 0 $page-padding-x;
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  overflow: hidden;

  &__inner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 14px 12px;
  }

  &__icon-col {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__icon { color: var(--color-accent); }

  &__content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__main { display: flex; align-items: baseline; gap: 1px; }

  &__amount {
    font-size: 20px;
    font-weight: 800;
    color: var(--color-text-primary);
    line-height: 1;

    &--over {
      font-size: 15px;
      color: #ef4444;
    }
  }

  &__per-day {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-muted);
  }

  &__subtitle {
    font-size: 11px;
    color: var(--color-text-muted);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__mini-stat {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
  }

  &__mini-remaining {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__mini-label {
    font-size: 10px;
    color: var(--color-text-muted);
  }

  &__bar-track {
    height: 3px;
    background: var(--color-border);
  }

  &__bar-fill {
    height: 100%;
    background: var(--color-accent);
    border-radius: 0 2px 2px 0;
    transition: width 0.4s ease;

    &--over { background: #ef4444; }
  }
}
</style>
