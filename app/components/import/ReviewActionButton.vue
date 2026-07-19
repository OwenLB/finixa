<template>
  <button class="rab" :class="`rab--${variant}`" :disabled="disabled || loading">
    <Loader2 v-if="loading" :size="size" class="rab__spin" />
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

withDefaults(defineProps<{
  variant?:  'accept' | 'dismiss' | 'edit' | 'neutral'
  disabled?: boolean
  loading?:  boolean
  size?:     number
}>(), { variant: 'neutral', disabled: false, loading: false, size: 15 })
</script>

<style scoped lang="scss">
.rab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  transition: background $transition-fast, opacity $transition-fast;

  &:disabled { opacity: 0.4; }

  &--accept {
    background: color-mix(in srgb, var(--color-success) 16%, transparent);
    color: var(--color-success);
    &:active:not(:disabled) { background: color-mix(in srgb, var(--color-success) 28%, transparent); }
  }

  &--dismiss {
    background: color-mix(in srgb, #ef4444 14%, transparent);
    color: #ef4444;
    &:active:not(:disabled) { background: color-mix(in srgb, #ef4444 26%, transparent); }
  }

  &--edit {
    background: var(--color-accent);
    color: var(--color-accent-fg);
    &:active:not(:disabled) { opacity: 0.8; }
  }

  &--neutral {
    background: var(--color-bg-elevated);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border-subtle);
    &:active:not(:disabled) { background: color-mix(in srgb, var(--color-text-muted) 12%, transparent); }
  }

  &__spin { animation: spin 0.7s linear infinite; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
