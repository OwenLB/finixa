<template>
  <div class="day-grid">
    <button
      v-for="day in max"
      :key="day"
      type="button"
      class="day-grid__day"
      :class="{
        'day-grid__day--selected': day === modelValue,
        'day-grid__day--short':    day >= 29,
      }"
      @click="$emit('update:modelValue', day)"
    >
      {{ day }}
    </button>
  </div>
</template>

<script setup lang="ts">
// Grille de sélection d'un jour du mois — partagée entre le réglage de période
// comptable, l'étape Période de l'onboarding et le day-picker des récurrences.
withDefaults(defineProps<{ modelValue: number; max?: number }>(), { max: 31 })
defineEmits<{ 'update:modelValue': [day: number] }>()
</script>

<style scoped lang="scss">
.day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;

  &__day {
    aspect-ratio: 1;
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text-primary);
    background: var(--color-bg-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background $transition-fast, transform $transition-fast, color $transition-fast;

    &:active { transform: scale(0.88); }

    &--short { color: var(--color-text-muted); }

    &--selected {
      background: var(--color-accent);
      color: var(--color-accent-fg);
      font-weight: 700;
      box-shadow: 0 2px 8px color-mix(in srgb, var(--color-accent) 40%, transparent);

      &:active { transform: scale(0.92); }
    }
  }
}
</style>
