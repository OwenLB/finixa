<template>
  <button type="button" class="fav-chip" @click="$emit('apply', favorite)">
    <span class="fav-chip__name">{{ favorite.name }}</span>
    <span class="fav-chip__amount">{{ fmt(Math.abs(favorite.amount)) }}</span>
  </button>
</template>

<script setup lang="ts">
import type { Favorite } from '~/types'

defineProps<{ favorite: Favorite }>()
defineEmits<{ apply: [fav: Favorite] }>()

const { fmt } = useCurrency()
</script>

<style scoped lang="scss">
.fav-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 12px;
  background: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity $transition-fast;

  &:active { opacity: 0.65; }

  &__name {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  &__amount {
    font-size: 11px;
    color: var(--color-text-muted);
  }
}
</style>
