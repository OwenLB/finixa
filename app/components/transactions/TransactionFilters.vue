<template>
  <div class="tx-filters">

    <!-- Bouton sélection (gauche) -->
    <button
      class="tx-filters__select-btn"
      :class="{
        'tx-filters__select-btn--active':    selectionStore.active,
        'tx-filters__select-btn--has-count': selectionStore.active && selectionStore.count > 0,
      }"
      @click="onSelectClick"
    >
      <template v-if="selectionStore.active && selectionStore.count > 0">
        <span>{{ selectionStore.count }}</span>
        <X :size="12" />
      </template>
      <Pencil v-else :size="14" />
    </button>

    <button
      class="tx-filters__chip"
      :class="{ 'tx-filters__chip--active': filterStore.status === 'pending' }"
      @click="filterStore.status = filterStore.status === 'pending' ? '' : 'pending'"
    >
      {{ $t('filters.unchecked') }}
    </button>

    <button
      class="tx-filters__chip"
      :class="{ 'tx-filters__chip--active': filterStore.uncategorized }"
      @click="filterStore.uncategorized = !filterStore.uncategorized"
    >
      {{ $t('filters.uncategorized') }}
    </button>

    <div class="tx-filters__group">
      <button
        v-if="filterStore.activeCount > 0"
        class="tx-filters__clear-btn"
        @click="filterStore.reset()"
      >
        <X :size="13" />
      </button>
      <button
        class="tx-filters__filter-btn"
        :class="{ 'tx-filters__filter-btn--active': filterStore.activeCount > 0 }"
        @click="$emit('open-filters')"
      >
        <Filter :size="14" />
        <span v-if="filterStore.activeCount > 0" class="tx-filters__count">{{ filterStore.activeCount }}</span>
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { Filter, X, Pencil } from 'lucide-vue-next'
import { useFilterStore }    from '~/stores/useFilterStore'
import { useSelectionStore } from '~/stores/useSelectionStore'

defineEmits<{ 'open-filters': [] }>()

const filterStore    = useFilterStore()
const selectionStore = useSelectionStore()

function onSelectClick() {
  if (selectionStore.active) selectionStore.exit()
  else                       selectionStore.enter()
}
</script>

<style scoped lang="scss">
.tx-filters {
  display: flex;
  align-items: center;
  gap: 8px;

  &__select-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 32px;
    min-width: 32px;
    padding: 0;
    background: var(--color-bg-elevated);
    border-radius: 99px;
    color: var(--color-text-primary);
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
    transition: background $transition-fast, color $transition-fast, padding $transition-fast, min-width $transition-fast;

    &--active {
      background: var(--color-accent);
      color: var(--color-accent-fg);
    }

    &--has-count {
      padding: 0 10px;
      min-width: 48px;
    }
  }

  &__chip {
    padding: 7px 14px;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 600;
    border: 1.5px solid var(--color-border);
    color: var(--color-text-muted);
    transition: all $transition-fast;
    white-space: nowrap;

    &--active {
      border-color: #f59e0b;
      color: #f59e0b;
    }
  }

  &__group {
    margin-left: auto;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  &__clear-btn {
    width: 30px;
    height: 32px;
    background: var(--color-accent);
    border-radius: 99px 0 0 99px;
    color: var(--color-accent-fg);
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid var(--color-border);
    transition: opacity $transition-fast;

    &:active { opacity: 0.6; }
  }

  &__filter-btn {
    position: relative;
    width: 32px;
    height: 32px;
    background: var(--color-bg-elevated);
    border-radius: 0 99px 99px 0;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background $transition-fast, color $transition-fast;

    &:first-child { border-radius: 99px; }
    &--active {
      background: var(--color-accent);
      color: var(--color-accent-fg);
    }
  }

  &__count {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 15px;
    height: 15px;
    padding: 0 3px;
    border-radius: 99px;
    background: #ef4444;
    color: white;
    font-size: 9px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
