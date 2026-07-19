<template>
  <AppDrawer v-model="open" :title="$t('favorites.sectionTitle')">

    <p v-if="store.favorites.length === 0" class="fpd__empty">
      {{ $t('favorites.emptySub') }}
    </p>

    <ul v-else class="fpd__list">
      <li
        v-for="fav in store.favorites"
        :key="fav.id"
        class="fpd__item"
        @click="apply(fav)"
      >
        <span class="fpd__dot" :style="{ background: categoryColor(fav) }" />
        <div class="fpd__info">
          <span class="fpd__name">{{ fav.name }}</span>
          <span class="fpd__meta">
            {{ fmt(Math.abs(fav.amount)) }}
            <span v-if="fav.subcategory || fav.category" :style="{ color: categoryColor(fav) }">
              · {{ fav.subcategory || fav.category }}
            </span>
          </span>
        </div>
        <ChevronRight :size="16" class="fpd__arrow" />
      </li>
    </ul>

  </AppDrawer>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import type { Favorite } from '~/types'
import { useFavoriteStore } from '~/stores/useFavoriteStore'
import { useCategoryStore, TYPE_COLOR  } from '~/stores/useCategoryStore'

const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ apply: [fav: Favorite] }>()

const store    = useFavoriteStore()
const catStore = useCategoryStore()
const { fmt }  = useCurrency()

function categoryColor(fav: Favorite): string {
  return catStore.categories.find(c => c.name === fav.category)?.color
    ?? TYPE_COLOR[fav.type]
}

function apply(fav: Favorite) {
  emit('apply', fav)
  open.value = false
}
</script>

<style scoped lang="scss">
.fpd {
  &__empty {
    font-size: 14px;
    color: var(--color-text-muted);
    text-align: center;
    padding: 24px 0;
  }

  &__list {
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 0;
    cursor: pointer;
    transition: opacity $transition-fast;

    & + & { border-top: 1px solid var(--color-border-subtle); }
    &:active { opacity: 0.6; }
  }

  &__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__meta {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  &__arrow {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }
}
</style>
