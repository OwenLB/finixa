<template>
  <div class="env-card">
    <div class="env-card__header">
      <span class="env-card__label">{{ label }}</span>
      <span class="env-card__badge" :class="`env-card__badge--${status}`">
        <component :is="statusIcon" :size="11" />
        {{ statusLabel }}
      </span>
    </div>

    <div class="env-card__amounts">
      <span class="env-card__allocated" :style="{ color }">{{ fmt(allocated) }}</span>
      <span class="env-card__sep">/</span>
      <span class="env-card__objective">{{ fmt(objective) }}</span>
    </div>

    <div class="env-card__track">
      <div
        class="env-card__fill"
        :style="{ width: fillWidth, background: color }"
      />
    </div>

    <p v-if="message" class="env-card__message" :class="`env-card__message--${status}`">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-vue-next'

const props = defineProps<{
  label:     string
  color:     string
  objective: number
  allocated: number
  status:    'ok' | 'warning' | 'alert'
  message:   string
}>()

const { fmt } = useCurrency()

const fillWidth = computed(() => {
  if (!props.objective) return '0%'
  return `${Math.min(100, (props.allocated / props.objective) * 100)}%`
})

const statusIcon = computed(() => {
  if (props.status === 'ok')      return CheckCircle
  if (props.status === 'warning') return AlertTriangle
  return AlertCircle
})

const statusLabel = computed(() => {
  if (props.status === 'ok')      return 'Conforme'
  if (props.status === 'warning') return 'Attention'
  return 'Non conforme'
})
</script>

<style scoped lang="scss">
.env-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__badge {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 99px;

    &--ok      { background: #34d39920; color: #34d399; }
    &--warning { background: #f9731620; color: #f97316; }
    &--alert   { background: #ef444420; color: #ef4444; }
  }

  &__amounts {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }

  &__allocated {
    font-size: 1.3rem;
    font-weight: 700;
  }

  &__sep {
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }

  &__objective {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text-muted);
  }

  &__track {
    height: 6px;
    background: var(--color-bg-elevated);
    border-radius: 3px;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: 3px;
    transition: width 400ms ease;
  }

  &__message {
    font-size: 0.78rem;
    font-weight: 500;
    line-height: 1.4;

    &--ok      { color: #34d399; }
    &--warning { color: #f97316; }
    &--alert   { color: #ef4444; }
  }
}
</style>
