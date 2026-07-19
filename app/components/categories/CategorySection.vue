<template>
  <section class="cat-section">
    <!-- Section header -->
    <div class="cat-section__header">
      <span class="cat-section__title" :style="{ color: typeColor }">{{ sectionLabel }}</span>
      <span v-if="sectionTotal > 0" class="cat-section__tag" :style="{ color: typeColor, borderColor: typeColor + '40', background: typeColor + '18' }">
        {{ fmtAmount(sectionTotal) }}
      </span>
    </div>

    <!-- Category cards -->
    <div ref="listRef" class="cat-section__list">
      <CategoriesCategoryCard
        v-for="(cat, i) in cats"
        :key="cat.id"
        :data-cat-index="i"
        :category="cat"
        :is-first="i === 0"
        :is-last="i === cats.length - 1"
        :is-dragging="draggedIndex === i"
        :is-target="dropTargetIndex === i && draggedIndex !== i"
        @move="store.moveCategory(cat.id, $event)"
        @edit="openEditCategory(cat)"
        @grip-down="(e) => startCategoryDrag(e, i)"
      />
    </div>

    <button class="cat-section__add-btn" @click="drawerOpen = true">
      <Plus :size="15" />
      {{ addLabel }}
    </button>

    <CategoriesCategoryDrawer
      v-model="drawerOpen"
      :type="type"
      :category="editingCategory ?? undefined"
    />
  </section>
</template>

<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { useCategoryStore, TYPE_COLOR } from '~/stores/useCategoryStore'
import type { ManagedCategory, TransactionType } from '~/types'

const props = defineProps<{ type: TransactionType }>()

const store = useCategoryStore()
const cats  = computed(() => store.byType(props.type))

const LABELS: Record<TransactionType, string> = {
  revenu:  'REVENUS',
  depense: 'DÉPENSES',
  epargne: 'ÉPARGNE',
}

const ADD_LABELS: Record<TransactionType, string> = {
  revenu:  'Ajouter un revenu',
  depense: 'Ajouter une dépense',
  epargne: 'Ajouter une épargne',
}

const typeColor    = computed(() => TYPE_COLOR[props.type])
const sectionLabel = computed(() => LABELS[props.type])
const addLabel     = computed(() => ADD_LABELS[props.type])

const drawerOpen      = ref(false)
const editingCategory = ref<ManagedCategory | null>(null)

function openEditCategory(cat: ManagedCategory) {
  editingCategory.value = cat
  drawerOpen.value      = true
}

watch(drawerOpen, (val) => {
  if (!val) editingCategory.value = null
})

// ── Drag-to-reorder des catégories (mobile) ───────────────────────
const listRef         = ref<HTMLElement>()
const draggedIndex    = ref<number | null>(null)
const dropTargetIndex = ref<number | null>(null)

function startCategoryDrag(e: PointerEvent, index: number) {
  draggedIndex.value    = index
  dropTargetIndex.value = index
  document.addEventListener('pointermove', onCategoryDragMove)
  document.addEventListener('pointerup', onCategoryDragUp, { once: true })
}

function onCategoryDragMove(e: PointerEvent) {
  if (!listRef.value) return
  const cards = listRef.value.querySelectorAll<HTMLElement>('[data-cat-index]')
  let found = false
  cards.forEach(card => {
    const rect = card.getBoundingClientRect()
    const mid  = rect.top + rect.height / 2
    if (!found && e.clientY < mid) {
      dropTargetIndex.value = parseInt(card.dataset.catIndex!)
      found = true
    }
  })
  if (!found) dropTargetIndex.value = cats.value.length - 1
}

async function onCategoryDragUp() {
  if (draggedIndex.value !== null && dropTargetIndex.value !== null && draggedIndex.value !== dropTargetIndex.value) {
    await store.moveCategoryTo(cats.value[draggedIndex.value]!.id, draggedIndex.value, dropTargetIndex.value)
  }
  draggedIndex.value    = null
  dropTargetIndex.value = null
  document.removeEventListener('pointermove', onCategoryDragMove)
}

onUnmounted(() => document.removeEventListener('pointermove', onCategoryDragMove))

const sectionTotal = computed(() => store.budgetTotals.get(props.type) ?? 0)

const { fmt: fmtAmount } = useCurrency()
</script>

<style scoped lang="scss">
.cat-section {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 $page-padding-x;
  }

  &__title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  &__tag {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 3px 8px;
    border-radius: 99px;
    border: 1px solid;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 $page-padding-x;
  }

  &__add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: calc(100% - #{$page-padding-x * 2});
    margin: 0 $page-padding-x;
    padding: 14px;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-muted);
    transition: border-color $transition-fast, color $transition-fast;

    &:hover {
      border-color: var(--color-text-muted);
      color: var(--color-text-primary);
    }
  }
}
</style>
