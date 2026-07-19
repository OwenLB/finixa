<template>
  <div class="sgc">
    <div class="sgc__header">
      <div class="sgc__icon" :style="{ background: goal.color + '22' }">
        <PiggyBank :size="13" :style="{ color: goal.color }" />
      </div>
      <span class="sgc__name">{{ goal.name }}</span>
      <ChevronRight :size="13" class="sgc__chevron" />
    </div>

    <UiBudgetProgressBar :value="goal.currentAmount" :max="goal.targetAmount" :color="goal.color" />

    <div class="sgc__divider" />

    <div class="sgc__footer">
      <div class="sgc__amounts">
        <span class="sgc__current">{{ fmt(goal.currentAmount) }}</span>
        <span class="sgc__target">/ {{ fmt(goal.targetAmount) }}</span>
      </div>
      <span class="sgc__pct">{{ pct }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PiggyBank, ChevronRight } from 'lucide-vue-next'
import type { SavingsGoal } from '~/types'

const props = defineProps<{ goal: SavingsGoal }>()
const { fmt } = useCurrency()

const pct = computed(() =>
  props.goal.targetAmount > 0
    ? Math.min(100, Math.round((props.goal.currentAmount / props.goal.targetAmount) * 100))
    : 0
)
</script>

<style scoped lang="scss">
.sgc {
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  padding: 12px 12px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__header {
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
    flex: 1;
  }

  &__chevron {
    color: var(--color-text-muted);
    flex-shrink: 0;
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
    padding-bottom: 10px;
  }

  &__amounts {
    display: flex;
    align-items: baseline;
    gap: 3px;
  }

  &__current {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__target {
    font-size: 11px;
    color: var(--color-text-muted);
  }

  &__pct {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
  }
}
</style>
