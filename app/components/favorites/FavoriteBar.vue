<template>
  <div v-if="store.favorites.length > 0" class="fav-bar">
    <div class="fav-bar__scroll">
      <FavoritesFavoriteChip
        v-for="fav in store.favorites"
        :key="fav.id"
        :favorite="fav"
        @apply="$emit('apply', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Favorite } from '~/types'
import { useFavoriteStore } from '~/stores/useFavoriteStore'

defineEmits<{ apply: [fav: Favorite] }>()

const store = useFavoriteStore()
</script>

<style scoped lang="scss">
.fav-bar {
  padding: 0 $page-padding-x;

  &__scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 2px;

    &::-webkit-scrollbar { display: none; }
  }
}
</style>
