<template>
  <Transition name="fav-suggest">
    <div v-if="matches.length" class="fav-suggest">
      <button
        v-for="fav in matches"
        :key="fav.id"
        class="fav-suggest__chip"
        :style="{ borderColor: `color-mix(in srgb, ${favColor(fav)} 55%, transparent)` }"
        type="button"
        @mousedown.prevent="$emit('apply', fav)"
      >
        <Star :size="11" class="fav-suggest__icon" :style="{ color: favColor(fav) }" />
        <span class="fav-suggest__name" :style="{ color: favColor(fav) }">{{ fav.name }}</span>
        <span class="fav-suggest__sep">·</span>
        <span class="fav-suggest__amount">{{ fmt(Math.abs(fav.amount)) }}</span>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import type { Favorite } from '~/types'
import { useFavoriteStore } from '~/stores/useFavoriteStore'
import { useCategoryStore } from '~/stores/useCategoryStore'
import { getCategoryIcon } from '~/utils/categoryIcon'

const props = defineProps<{ label: string }>()
defineEmits<{ apply: [fav: Favorite] }>()

const store    = useFavoriteStore()
const catStore = useCategoryStore()
const { fmt }  = useCurrency()

const matches = computed(() => {
  if (!props.label.trim()) return []
  const q = props.label.toLowerCase()
  return store.favorites.filter(f => f.name.toLowerCase().includes(q))
})

function favColor(fav: Favorite) {
  return getCategoryIcon(fav.subcategory || fav.category, catStore.categories).iconColor
}
</script>

<style scoped lang="scss">
.fav-suggest {
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
    border: 2px solid transparent;
    transition: border-color $transition-fast;
  }

  &__icon { flex-shrink: 0; }

  &__name {
    font-size: 12px;
    font-weight: 600;
    max-width: 130px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__sep { font-size: 11px; color: var(--color-text-muted); }

  &__amount {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-muted);
  }
}

.fav-suggest-enter-active,
.fav-suggest-leave-active { transition: opacity $transition-fast, transform $transition-fast; }
.fav-suggest-enter-from,
.fav-suggest-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>
