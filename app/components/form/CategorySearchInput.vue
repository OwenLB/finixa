<template>
  <div ref="rootRef" class="cat-search">
    <div class="cat-search__field" :class="{ 'cat-search__field--open': showResults }">
      <Search :size="15" class="cat-search__icon" />
      <input
        ref="inputRef"
        v-model="query"
        class="cat-search__input"
        type="search"
        placeholder="Alimentation, Cinéma..."
        autocomplete="off"
        @focus="showResults = query.length > 0"
        @input="showResults = true"
        @keydown.escape="close"
        @keydown.down.prevent="moveDown"
        @keydown.up.prevent="moveUp"
        @keydown.enter.prevent="selectActive"
      />
      <button v-if="query" class="cat-search__clear" :aria-label="$t('a11y.clear')" @click="clear">
        <X :size="13" />
      </button>
    </div>

    <!-- Dropdown résultats -->
    <Transition name="cat-dropdown">
      <ul v-if="showResults && results.length" class="cat-search__results">
        <li
          v-for="(result, i) in results"
          :key="`${result.type}-${result.category}-${result.subcategory}`"
          class="cat-search__result"
          :class="{ 'cat-search__result--active': activeIndex === i }"
          @mousedown.prevent="select(result)"
        >
          <div class="cat-search__result-main">
            <span class="cat-search__result-name">{{ result.subcategory ?? result.category }}</span>
            <span v-if="result.subcategory" class="cat-search__result-badge cat-search__result-badge--sub">
              Sous-cat.
            </span>
          </div>
          <span class="cat-search__result-breadcrumb">
            {{ typeLabel(result.type) }}
            <template v-if="result.subcategory"> › {{ result.category }}</template>
          </span>
        </li>
      </ul>

      <div v-else-if="showResults && query.length > 0" class="cat-search__empty">
        Aucun résultat pour "{{ query }}"
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'
import { TRANSACTION_TYPES } from '~/types'
import { useCategoryStore } from '~/stores/useCategoryStore'
import type { TransactionType } from '~/types'

export interface CategorySelection {
  type: TransactionType
  category: string
  subcategory: string
}

const emit          = defineEmits<{ select: [value: CategorySelection] }>()
const categoryStore = useCategoryStore()

interface SearchResult {
  type: TransactionType
  category: string
  subcategory?: string
}

// Index plat réactif — se met à jour si les catégories changent
const index = computed<SearchResult[]>(() =>
  categoryStore.categories.flatMap(cat => [
    { type: cat.type, category: cat.name },
    ...cat.subcategories.map(sub => ({ type: cat.type, category: cat.name, subcategory: sub.name })),
  ])
)

const query       = ref('')
const showResults = ref(false)
const activeIndex = ref(-1)
const rootRef     = ref<HTMLElement>()
const inputRef    = ref<HTMLInputElement>()

const results = computed<SearchResult[]>(() => {
  if (!query.value.trim()) return []
  const q = query.value.toLowerCase()
  return index.value.filter(r =>
    r.category.toLowerCase().includes(q) ||
    r.subcategory?.toLowerCase().includes(q)
  ).slice(0, 8)
})

watch(results, () => { activeIndex.value = -1 })

function typeLabel(type: TransactionType) {
  return TRANSACTION_TYPES.find(t => t.value === type)?.label ?? type
}

function select(result: SearchResult) {
  emit('select', {
    type:        result.type,
    category:    result.category,
    subcategory: result.subcategory ?? '',
  })
  query.value       = result.subcategory ?? result.category
  showResults.value = false
}

function selectActive() {
  if (activeIndex.value >= 0 && results.value[activeIndex.value]) {
    select(results.value[activeIndex.value])
  }
}

function moveDown() {
  activeIndex.value = Math.min(activeIndex.value + 1, results.value.length - 1)
}

function moveUp() {
  activeIndex.value = Math.max(activeIndex.value - 1, -1)
}

function clear() {
  query.value       = ''
  showResults.value = false
  inputRef.value?.focus()
}

function close() {
  showResults.value = false
}

function reset() {
  query.value       = ''
  showResults.value = false
}

defineExpose({ reset })

// Ferme en cliquant en dehors
onMounted(() => {
  document.addEventListener('click', onOutsideClick)
})
onUnmounted(() => {
  document.removeEventListener('click', onOutsideClick)
})
function onOutsideClick(e: MouseEvent) {
  if (!rootRef.value?.contains(e.target as Node)) {
    showResults.value = false
  }
}
</script>

<style scoped lang="scss">
.cat-search {
  position: relative;

  &__field {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--color-bg-elevated);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: 13px 14px;
    transition: border-color $transition-fast, border-radius $transition-fast;

    &--open {
      border-color: var(--color-accent);
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
  }

  &__icon { color: var(--color-text-muted); flex-shrink: 0; }

  &__input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 14px;
    color: var(--color-text-primary);

    &::placeholder { color: var(--color-text-muted); }
    &::-webkit-search-cancel-button { display: none; }
  }

  &__clear {
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    padding: 2px;
  }

  // --- Dropdown ---
  &__results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-accent);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    overflow: hidden;
    z-index: 50;
    list-style: none;
  }

  &__result {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 14px;
    cursor: pointer;
    transition: background $transition-fast;

    &:not(:last-child) { border-bottom: 1px solid var(--color-border-subtle); }
    &--active,
    &:hover { background: var(--color-bg-card); }

    &-main {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-primary);
    }

    &-badge {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      padding: 1px 6px;
      border-radius: 4px;

      &--sub {
        background: color-mix(in srgb, var(--color-accent) 15%, transparent);
        color: var(--color-accent);
      }
    }

    &-breadcrumb {
      font-size: 11px;
      color: var(--color-text-muted);
    }
  }

  &__empty {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    padding: 14px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-accent);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    font-size: 13px;
    color: var(--color-text-muted);
    z-index: 50;
  }
}

// Transition dropdown
.cat-dropdown-enter-active,
.cat-dropdown-leave-active { transition: opacity $transition-fast, transform $transition-fast; }
.cat-dropdown-enter-from,
.cat-dropdown-leave-to    { opacity: 0; transform: translateY(-4px); }
</style>
