<template>
  <div class="stepper">
    <div class="stepper__row">
      <button v-if="showBack" class="stepper__back" :aria-label="$t('a11y.back')" @click="$emit('back')">
        <ChevronLeft :size="18" />
      </button>
      <div v-else class="stepper__spacer" />

      <div class="stepper__steps">
        <!-- Rail continu derrière les pastilles -->
        <div class="stepper__rail" />
        <div class="stepper__rail-fill" :style="{ width: `calc(75% * ${progress})` }" />

        <div
          v-for="(key, i) in STEP_KEYS"
          :key="key"
          class="stepper__step"
          :class="{
            'stepper__step--done':   step > i + 1,
            'stepper__step--active': step === i + 1,
          }"
        >
          <div class="stepper__circle">
            <Check v-if="step > i + 1" :size="12" />
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="stepper__label">{{ $t(`onboarding.stepper.${key}`) }}</span>
        </div>
      </div>

      <div class="stepper__action">
        <slot name="action" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, Check } from 'lucide-vue-next'

const STEP_KEYS = ['bases', 'categories', 'recurring', 'period'] as const

const props = defineProps<{ step: number; showBack?: boolean }>()
defineEmits<{ back: [] }>()

// Fraction de remplissage du rail : du centre de la 1re pastille à celui de
// la pastille active (0 → 1 sur n-1 intervalles).
const progress = computed(() => {
  const last = STEP_KEYS.length - 1
  return Math.min(Math.max(props.step - 1, 0), last) / last
})
</script>

<style scoped lang="scss">
.stepper {
  padding: calc(16px + env(safe-area-inset-top)) $page-padding-x 20px;

  &__row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  &__back {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-bg-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    flex-shrink: 0;
    transition: opacity $transition-fast;
    &:active { opacity: 0.6; }
  }

  &__spacer { width: 32px; flex-shrink: 0; }

  &__action {
    min-width: 32px;
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    padding-top: 6px;
  }

  &__steps {
    position: relative;
    flex: 1;
    display: flex;
    justify-content: space-between;
    padding-top: 1px;
  }

  // Rail : ligne pleine reliant les centres des pastilles. Colonnes en flex:1,
  // donc les centres tombent à 12,5 % / 37,5 % / 62,5 % / 87,5 % — inset = 12,5 %.
  &__rail,
  &__rail-fill {
    position: absolute;
    top: 14px;
    left: 12.5%;
    height: 2px;
    border-radius: 2px;
  }

  &__rail {
    right: 12.5%;
    background: var(--color-border);
  }

  &__rail-fill {
    background: var(--color-accent);
    transition: width $transition-base;
  }

  &__step {
    position: relative;
    z-index: 1;
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;

    &--active {
      .stepper__circle {
        background: var(--color-accent);
        color: var(--color-accent-fg);
        border-color: var(--color-accent);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-accent) 16%, transparent);
      }
      .stepper__label { color: var(--color-text-primary); font-weight: 600; }
    }

    &--done {
      .stepper__circle {
        background: var(--color-accent);
        color: var(--color-accent-fg);
        border-color: var(--color-accent);
      }
      .stepper__label { color: var(--color-text-secondary); }
    }
  }

  &__circle {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    background: var(--color-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: var(--color-text-muted);
    transition: background $transition-fast, color $transition-fast, border-color $transition-fast, box-shadow $transition-fast;
  }

  &__label {
    font-size: 9px;
    font-weight: 500;
    color: var(--color-text-muted);
    white-space: nowrap;
    letter-spacing: 0.01em;
    transition: color $transition-fast;
  }
}
</style>
