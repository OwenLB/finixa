<template>
  <div class="cat-card" :style="{ '--type-color': category.color }">

    <!-- Header -->
    <div
      class="cat-card__header"
      :class="{
        'cat-card__header--dragging': isDragging,
        'cat-card__header--target':   isTarget,
      }"
    >
      <GripVertical
        :size="16"
        class="cat-card__grip"
        @pointerdown.prevent="$emit('grip-down', $event)"
      />
      <button class="cat-card__title-row" @click="$emit('edit')">
        <div class="cat-card__icon" :style="{ background: category.color + '28' }">
          <component :is="getIcon(category.iconKey)" :size="15" :style="{ color: category.color }" />
        </div>
        <span class="cat-card__name">{{ category.name }}</span>
      </button>
      <div class="cat-card__header-right">
        <span v-if="totalBudget > 0" class="cat-card__total">{{ fmtAmount(totalBudget) }}</span>
        <div class="cat-card__arrows">
          <button class="cat-card__arrow" :disabled="isFirst" :aria-label="$t('a11y.moveUp')" @click="$emit('move', 'up')">
            <ArrowUp :size="13" />
          </button>
          <button class="cat-card__arrow" :disabled="isLast" :aria-label="$t('a11y.moveDown')" @click="$emit('move', 'down')">
            <ArrowDown :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- Sous-catégories -->
    <div ref="subsRef" class="cat-card__subs">
      <div
        v-for="(sub, i) in category.subcategories"
        :key="sub.id"
        :data-sub-index="i"
      >
        <CategoriesSubCategoryRow
          :sub="sub"
          :color="subColors[i] ?? category.color"
          :bar-color="subColors[i] ?? category.color"
          :max-budget="maxBudget"
          :is-dragging="draggedIndex === i"
          :is-target="dropTargetIndex === i && draggedIndex !== i"
          @grip-down="(e) => startDrag(e, i)"
          @edit="openEditSub(sub)"
        />
      </div>
    </div>

    <!-- Ajouter sous-catégorie -->
    <button class="cat-card__add-sub" @click="subDrawerOpen = true">
      <Plus :size="13" />
      Ajouter une sous-catégorie
    </button>

    <CategoriesSubCategoryDrawer
      v-model="subDrawerOpen"
      :cat-id="category.id"
      :cat-type="category.type"
      :type-color="category.color"
      :sub="editingSub ?? undefined"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowUp, ArrowDown, Plus, GripVertical } from 'lucide-vue-next'
import { useCategoryStore } from '~/stores/useCategoryStore'
import type { ManagedCategory, SubCategory } from '~/types'
import { getIcon } from '~/utils/iconRegistry'
import { deriveSubColors } from '~/utils/colorUtils'
import { useTheme } from '~/composables/useTheme'

const props = defineProps<{
  category:   ManagedCategory
  isFirst:    boolean
  isLast:     boolean
  isDragging?: boolean
  isTarget?:   boolean
}>()

defineEmits<{ move: [direction: 'up' | 'down']; edit: []; 'grip-down': [e: PointerEvent] }>()

const store = useCategoryStore()
const { isDark } = useTheme()

const subColors = computed(() =>
  deriveSubColors(props.category.color, props.category.subcategories.length, isDark.value)
)

const totalBudget = computed(() => props.category.totalBudget)

const maxBudget = computed(() =>
  Math.max(...props.category.subcategories.map(s => s.budget ?? 0), 1)
)

const { fmt: fmtAmount } = useCurrency()

// --- Drawer sous-catégorie (add + edit) ---
const subDrawerOpen = ref(false)
const editingSub    = ref<SubCategory | null>(null)

function openEditSub(sub: SubCategory) {
  editingSub.value    = sub
  subDrawerOpen.value = true
}

watch(subDrawerOpen, (val) => {
  if (!val) editingSub.value = null
})

// --- Drag & drop via Pointer Events ---
const subsRef        = ref<HTMLElement>()
const draggedIndex   = ref<number | null>(null)
const dropTargetIndex = ref<number | null>(null)

function startDrag(e: PointerEvent, index: number) {
  draggedIndex.value    = index
  dropTargetIndex.value = index
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp, { once: true })
}

function onPointerMove(e: PointerEvent) {
  if (!subsRef.value) return
  const rows = subsRef.value.querySelectorAll<HTMLElement>('[data-sub-index]')
  let found = false
  rows.forEach(row => {
    const rect = row.getBoundingClientRect()
    const mid  = rect.top + rect.height / 2
    if (!found && e.clientY < mid) {
      dropTargetIndex.value = parseInt(row.dataset.subIndex!)
      found = true
    }
  })
  if (!found) dropTargetIndex.value = props.category.subcategories.length - 1
}

function onPointerUp() {
  if (draggedIndex.value !== null && dropTargetIndex.value !== null) {
    store.moveSubcategory(props.category.id, draggedIndex.value, dropTargetIndex.value)
  }
  draggedIndex.value    = null
  dropTargetIndex.value = null
  document.removeEventListener('pointermove', onPointerMove)
}

onUnmounted(() => document.removeEventListener('pointermove', onPointerMove))
</script>

<style scoped lang="scss">
.cat-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  overflow: hidden;

  &__header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 14px 12px;
    border-bottom: 1px solid var(--color-border-subtle);
    gap: 6px;

    &--dragging { opacity: 0.35; }

    &--target::before {
      content: '';
      position: absolute;
      top: 0;
      left: 14px;
      right: 14px;
      height: 2px;
      border-radius: 1px;
      background: var(--color-accent);
    }
  }

  &__grip {
    color: var(--color-border);
    cursor: grab;
    flex-shrink: 0;
    touch-action: none;

    &:active { cursor: grabbing; color: var(--color-text-muted); }

    // Masquer sur desktop — les flèches suffisent
    @media (min-width: $breakpoint-lg) { display: none; }
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 10px;

    @media (min-width: $breakpoint-lg) {
      &:hover .cat-card__name { color: var(--type-color); }
    }
  }

  &__icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__header-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__total {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__arrows {
    display: flex;
    gap: 4px;
    // Masquer sur mobile — remplacé par le grip
    @media (max-width: #{$breakpoint-lg - 1px}) { display: none; }
  }

  &__arrow {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--color-bg-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    transition: background $transition-fast, color $transition-fast;

    &:hover:not(:disabled) {
      background: var(--color-border);
      color: var(--color-text-primary);
    }

    &:disabled { opacity: 0.2; }
  }

  &__subs {
    padding-bottom: 4px;
  }

  &__add-sub {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 10px 14px 12px;
    font-size: 12px;
    color: var(--color-text-muted);
    transition: color $transition-fast;

    &:hover { color: var(--type-color); }
  }
}
</style>
