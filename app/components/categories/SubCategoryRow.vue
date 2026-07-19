<template>
  <div
    class="sub-row"
    :class="{
      'sub-row--dragging': isDragging,
      'sub-row--target':   isTarget,
    }"
  >
    <div class="sub-row__content">
      <GripVertical
        :size="14"
        class="sub-row__grip"
        @pointerdown.prevent="$emit('grip-down', $event)"
      />
      <button class="sub-row__body" @click="$emit('edit')">
        <span class="sub-row__dot" :style="{ background: color }" />
        <span class="sub-row__name">{{ sub.name }}</span>
        <span v-if="sub.budget != null && sub.budget > 0" class="sub-row__amount">{{ fmtBudget(sub.budget) }}</span>
        <span v-else-if="sub.budget === null" class="sub-row__no-budget">—</span>
      </button>
    </div>
    <div class="sub-row__bar-track">
      <div class="sub-row__bar" :style="{ background: barColor, width: barWidth }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { GripVertical } from 'lucide-vue-next'
import type { SubCategory } from '~/types'

const props = defineProps<{
  sub:        SubCategory
  color:      string
  barColor:   string
  maxBudget:  number
  isDragging?: boolean
  isTarget?:   boolean
}>()

defineEmits<{ 'grip-down': [e: PointerEvent]; edit: [] }>()

const barWidth = computed(() => {
  if (props.sub.budget == null || !props.sub.budget) return '0%'
  if (!props.maxBudget)  return '100%'
  return `${Math.min(100, (props.sub.budget / props.maxBudget) * 100)}%`
})

const { fmt: fmtBudget } = useCurrency()
</script>

<style scoped lang="scss">
.sub-row {
  padding: 10px 14px 12px;
  transition: opacity $transition-fast;
  position: relative;

  &--dragging { opacity: 0.35; }

  &--target::before {
    content: '';
    position: absolute;
    top: 0;
    left: 14px;
    right: 14px;
    height: 2px;
    border-radius: 1px;
    background: var(--color-accent);
  }

  &__content {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 8px;
  }

  &__grip {
    color: var(--color-border);
    cursor: grab;
    flex-shrink: 0;
    touch-action: none;

    &:active { cursor: grabbing; color: var(--color-text-muted); }
  }

  &__body {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__name {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-primary);
    text-align: left;
  }

  &__amount {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary);
    flex-shrink: 0;
  }

  &__no-budget {
    font-size: 13px;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  &__bar-track {
    height: 4px;
    background: var(--color-bg-elevated);
    border-radius: 99px;
    overflow: hidden;
  }

  &__bar {
    height: 100%;
    border-radius: 99px;
    transition: width 400ms ease;
  }
}
</style>
