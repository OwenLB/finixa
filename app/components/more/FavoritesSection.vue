<template>
  <MoreSettingsRow
    :label="`${$t('favorites.sectionTitle')} (${store.favorites.length})`"
    icon-bg="#f59e0b20"
    clickable
    chevron
    @click="openDrawer"
  >
    <template #icon><Star :size="16" style="color:#f59e0b" /></template>
  </MoreSettingsRow>

  <AppDrawer v-model="drawerOpen" :title="$t('favorites.sectionTitle')">

    <div v-if="store.favorites.length === 0" class="fs__empty">
      {{ $t('favorites.empty') }}
    </div>

    <ul
      v-else
      class="fs__list"
      @pointermove="onPointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
    >
      <li
        v-for="(fav, index) in store.favorites"
        :key="fav.id"
        class="fs__item"
        :class="{ 'fs__item--dragging': dragIndex === index }"
        :style="itemStyle(index)"
      >
        <div
          class="fs__handle"
          @pointerdown.prevent="startDrag($event, index)"
        >
          <GripVertical :size="16" />
        </div>

        <div class="fs__info">
          <span class="fs__name">{{ fav.name }}</span>
          <span class="fs__meta">
            {{ fmt(Math.abs(fav.amount)) }} ·
            <span :style="categoryColor(fav) ? { color: categoryColor(fav) } : {}">
              {{ fav.subcategory || fav.category || $t(`types.${fav.type}`) }}
            </span>
          </span>
        </div>

        <button class="fs__action-btn" :aria-label="$t('a11y.edit')" @click="openEdit(fav)">
          <Pencil :size="15" />
        </button>
        <button class="fs__action-btn fs__action-btn--danger" :aria-label="$t('a11y.delete')" @click="deleteFav(fav)">
          <Trash2 :size="15" />
        </button>
      </li>
    </ul>

    <AppButton @click="openAdd">
      {{ $t('favorites.drawerTitle') }}
    </AppButton>

  </AppDrawer>

  <FavoritesFavoriteFormDrawer
    v-model="formOpen"
    :editing="editingFavorite"
  />
</template>

<script setup lang="ts">
import { Star, GripVertical, Pencil, Trash2 } from 'lucide-vue-next'
import type { Favorite } from '~/types'
import { useFavoriteStore } from '~/stores/useFavoriteStore'
import { useCategoryStore } from '~/stores/useCategoryStore'
import { useToast } from '~/composables/useToast'

const { t }     = useI18n()
const { fmt }   = useCurrency()
const store     = useFavoriteStore()
const catStore  = useCategoryStore()
const toast     = useToast()

function categoryColor(fav: Favorite): string | undefined {
  return catStore.categories.find(c => c.name === fav.category)?.color
}

const drawerOpen     = ref(false)
const formOpen       = ref(false)
const editingFavorite = ref<Favorite | null>(null)

async function openDrawer() {
  await Promise.all([store.fetch(), catStore.fetch()])
  drawerOpen.value = true
}

function openAdd() {
  editingFavorite.value = null
  formOpen.value = true
}

function openEdit(fav: Favorite) {
  editingFavorite.value = fav
  formOpen.value = true
}

async function deleteFav(fav: Favorite) {
  if (!confirm(t('favorites.deleteConfirm'))) return
  await store.remove(fav.id)
  toast.show(t('favorites.toast.deleted'), { type: 'success' })
}

// ─── Drag-and-drop ────────────────────────────────────────────────────────────
const ITEM_HEIGHT = 53   // padding 14px*2 + content ~25px

const dragIndex   = ref(-1)
const dragOffsetY = ref(0)
let   dragStartY  = 0
let   captureEl: HTMLElement | null = null

function startDrag(e: PointerEvent, index: number) {
  dragIndex.value   = index
  dragOffsetY.value = 0
  dragStartY        = e.clientY
  captureEl         = e.currentTarget as HTMLElement
  captureEl.setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (dragIndex.value === -1) return
  dragOffsetY.value = e.clientY - dragStartY
}

async function endDrag() {
  if (dragIndex.value === -1) return
  const steps    = Math.round(dragOffsetY.value / ITEM_HEIGHT)
  const newIndex = Math.max(0, Math.min(store.favorites.length - 1, dragIndex.value + steps))
  const oldIndex = dragIndex.value

  // Reset visual state before the async reorder to avoid flicker
  dragIndex.value   = -1
  dragOffsetY.value = 0

  if (newIndex !== oldIndex) await store.reorder(oldIndex, newIndex)
}

function itemStyle(index: number): Record<string, string> {
  if (dragIndex.value === -1) return {}

  if (index === dragIndex.value) {
    return {
      transform:  `translateY(${dragOffsetY.value}px)`,
      zIndex:     '10',
      position:   'relative',
      boxShadow:  '0 4px 16px rgba(0,0,0,0.18)',
      background: 'var(--color-bg-elevated)',
      borderRadius: 'var(--radius-md)',
    }
  }

  const steps      = Math.round(dragOffsetY.value / ITEM_HEIGHT)
  const targetIndex = Math.max(0, Math.min(store.favorites.length - 1, dragIndex.value + steps))

  if (steps > 0 && index > dragIndex.value && index <= targetIndex) {
    return { transform: `translateY(-${ITEM_HEIGHT}px)`, transition: 'transform 150ms ease' }
  }
  if (steps < 0 && index < dragIndex.value && index >= targetIndex) {
    return { transform: `translateY(${ITEM_HEIGHT}px)`, transition: 'transform 150ms ease' }
  }
  return { transition: 'transform 150ms ease' }
}
</script>

<style scoped lang="scss">
.fs {
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

    & + & { border-top: 1px solid var(--color-border-subtle); }

    &--dragging {
      opacity: 0.95;
    }
  }

  &__handle {
    display: flex;
    align-items: center;
    padding: 4px;
    color: var(--color-text-muted);
    touch-action: none;
    cursor: grab;

    &:active { cursor: grabbing; }
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  &__action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    flex-shrink: 0;

    &:active { opacity: 0.7; }

    &--danger { color: var(--color-danger, #ef4444); }
  }
}
</style>
