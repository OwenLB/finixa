<template>
  <Transition name="fav-inline">
    <div v-if="modelValue === ''" class="fav-inline">

      <!-- Pills des favoris -->
      <div v-if="store.favorites.length > 0" class="fav-inline__scroll">
        <button
          v-for="fav in store.favorites"
          :key="fav.id"
          class="fav-inline__pill"
          @click="$emit('apply', fav)"
        >
          {{ fav.name }}
        </button>

        <button class="fav-inline__see-all" @click="$emit('openDrawer')">
          {{ $t('favorites.seeAll') }} →
        </button>
      </div>

      <!-- Pas encore de favoris -->
      <p v-else class="fav-inline__empty">
        {{ $t('favorites.inlineEmpty') }}
      </p>

    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { Favorite } from '~/types'
import { useFavoriteStore } from '~/stores/useFavoriteStore'

defineProps<{ modelValue: string }>()
defineEmits<{ apply: [fav: Favorite]; openDrawer: [] }>()

const store = useFavoriteStore()
</script>

<style scoped lang="scss">
.fav-inline {
  padding: 0 $page-padding-x;

  &__scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }

  &__pill {
    flex-shrink: 0;
    padding: 6px 14px;
    background: var(--color-bg-elevated);
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-primary);
    white-space: nowrap;
    transition: opacity $transition-fast;

    &:active { opacity: 0.6; }
  }

  &__see-all {
    flex-shrink: 0;
    padding: 6px 4px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-accent);
    white-space: nowrap;
    transition: opacity $transition-fast;

    &:active { opacity: 0.6; }
  }

  &__empty {
    font-size: 12px;
    color: var(--color-text-muted);
    font-style: italic;
  }
}

.fav-inline-enter-active,
.fav-inline-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.fav-inline-enter-from,
.fav-inline-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>
