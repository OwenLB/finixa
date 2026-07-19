<template>
  <Transition name="suggest">
    <div v-if="suggestions.length" class="label-suggest">
      <button
        v-for="s in suggestions"
        :key="`${s.label}-${s.category}`"
        class="label-suggest__chip"
        type="button"
        @mousedown.prevent="$emit('select', s)"
      >
        <Sparkles :size="11" class="label-suggest__icon" />
        <span class="label-suggest__type">{{ $t(`types.${s.type}`) }}</span>
        <span class="label-suggest__sep">·</span>
        <span class="label-suggest__cat">{{ s.category }}</span>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'
import type { LabelSuggestion } from '~/services/predictionService'

defineProps<{ suggestions: LabelSuggestion[] }>()
defineEmits<{ select: [s: LabelSuggestion] }>()
</script>

<style scoped lang="scss">
.label-suggest {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 2px;

  &__chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 99px;
    background: var(--color-bg-elevated);
    border: 2px solid color-mix(in srgb, #a78bfa 65%, transparent);
    transition: border-color $transition-fast;

    &:active {
      border-color: color-mix(in srgb, #a78bfa 90%, transparent);
    }
  }

  &__icon {
    color: #a78bfa;
    flex-shrink: 0;
    animation: ai-sparkle 2.4s ease-in-out infinite;
  }

  &__type {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-muted);
    text-transform: lowercase;
  }

  &__sep {
    font-size: 11px;
    color: var(--color-text-muted);
  }

  &__cat {
    font-size: 12px;
    font-weight: 600;
    color: #a78bfa;
    max-width: 120px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

@keyframes ai-sparkle {
  0%, 100% { opacity: 1;   transform: scale(1);    }
  50%       { opacity: 0.5; transform: scale(0.82); }
}

.suggest-enter-active, .suggest-leave-active { transition: opacity $transition-fast, transform $transition-fast; }
.suggest-enter-from, .suggest-leave-to       { opacity: 0; transform: translateY(-4px); }
</style>
