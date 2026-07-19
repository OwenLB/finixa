<template>
  <div v-if="total > 0" class="breakdown-panel">
    <div class="breakdown-panel__chart-wrap">
      <UiDonutChart :segments="segments" :total="total">
        <slot />
      </UiDonutChart>
    </div>

    <div class="breakdown-panel__legend">
      <div v-for="seg in segments" :key="seg.name" class="breakdown-panel__row">
        <div class="breakdown-panel__dot" :style="{ background: seg.color }" />
        <span class="breakdown-panel__name">{{ seg.name }}</span>
        <span class="breakdown-panel__pct">{{ Math.round((seg.value / total) * 100) }}%</span>
        <span class="breakdown-panel__amount">{{ fmt(seg.value) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface BreakdownSegment {
  name:  string
  color: string
  value: number
}

defineProps<{
  segments: BreakdownSegment[]
  total:    number
}>()

const { fmt } = useCurrency()
</script>

<style scoped lang="scss">
.breakdown-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;

  &__chart-wrap {
    display: flex;
    justify-content: center;
  }

  &__legend {
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;

    & + & { border-top: 1px solid var(--color-border-subtle); }
  }

  &__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__name {
    flex: 1;
    font-size: 14px;
    color: var(--color-text-primary);
  }

  &__pct {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  &__amount {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-primary);
  }
}
</style>
