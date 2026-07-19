<template>
  <AppDrawer v-model="open" :title="$t('filters.title')">
    <div class="fdr">

      <!-- Période -->
      <TransactionFilterSection :title="$t('filters.period')">
        <div class="fdr__segment">
          <button
            class="fdr__segment-btn"
            :class="{ 'fdr__segment-btn--active': periodStore.mode === 'month' }"
            @click="periodStore.setMode('month')"
          >{{ $t('filters.periodMonth') }}</button>
          <button
            class="fdr__segment-btn"
            :class="{ 'fdr__segment-btn--active': periodStore.mode === 'year' }"
            @click="periodStore.setMode('year')"
          >{{ $t('filters.periodYear') }}</button>
        </div>
        <div v-if="periodStore.mode === 'year'" class="fdr__year-nav">
          <button class="fdr__year-arrow" :aria-label="$t('a11y.previous')" @click="periodStore.prev()">
            <ChevronLeft :size="18" />
          </button>
          <span class="fdr__year-label">{{ periodStore.year }}</span>
          <button class="fdr__year-arrow" :disabled="!periodStore.canGoNext" :aria-label="$t('a11y.next')" @click="periodStore.next()">
            <ChevronRight :size="18" />
          </button>
        </div>
      </TransactionFilterSection>

      <!-- Type -->
      <TransactionFilterSection :title="$t('filters.type')">
        <div class="fdr__chips">
          <button
            v-for="type in TYPES"
            :key="type"
            class="fdr__chip"
            :class="{ 'fdr__chip--active': filterStore.types.includes(type) }"
            :style="filterStore.types.includes(type) ? { borderColor: TYPE_COLOR[type], color: TYPE_COLOR[type] } : {}"
            @click="filterStore.toggleType(type)"
          >
            {{ $t(`types.${type}`) }}
          </button>
        </div>
      </TransactionFilterSection>

      <!-- Catégorie -->
      <TransactionFilterSection v-if="visibleCategories.length" :title="$t('filters.category')">
        <div class="fdr__list">
          <button
            v-for="cat in visibleCategories"
            :key="cat.id"
            class="fdr__list-item"
            :class="{ 'fdr__list-item--active': filterStore.categories.includes(cat.name) }"
            @click="filterStore.toggleCategory(cat.name)"
          >
            <div class="fdr__list-item-left">
              <div class="fdr__cat-icon" :style="{ background: cat.color + '22' }">
                <component :is="getIcon(cat.iconKey)" :size="12" :style="{ color: cat.color }" />
              </div>
              <span>{{ cat.name }}</span>
            </div>
            <Check v-if="filterStore.categories.includes(cat.name)" :size="15" class="fdr__check" />
          </button>
        </div>
      </TransactionFilterSection>

      <!-- Sous-catégorie (visible uniquement si catégorie sélectionnée) -->
      <TransactionFilterSection
        v-if="filterStore.categories.length && visibleSubcategories.length"
        :title="$t('filters.subcategory')"
      >
        <div class="fdr__list">
          <button
            v-for="sub in visibleSubcategories"
            :key="sub.id"
            class="fdr__list-item"
            :class="{ 'fdr__list-item--active': filterStore.subcategories.includes(sub.name) }"
            @click="filterStore.toggleSubcategory(sub.name)"
          >
            <span>{{ sub.name }}</span>
            <Check v-if="filterStore.subcategories.includes(sub.name)" :size="15" class="fdr__check" />
          </button>
        </div>
      </TransactionFilterSection>

      <!-- Catégorisation -->
      <TransactionFilterSection :title="$t('filters.categorization')">
        <div class="fdr__segment">
          <button class="fdr__segment-btn" :class="{ 'fdr__segment-btn--active': !filterStore.uncategorized }" @click="filterStore.uncategorized = false">{{ $t('filters.categorizationAll') }}</button>
          <button class="fdr__segment-btn" :class="{ 'fdr__segment-btn--active': filterStore.uncategorized }"  @click="filterStore.uncategorized = true">{{ $t('filters.uncategorized') }}</button>
        </div>
      </TransactionFilterSection>

      <!-- Statut -->
      <TransactionFilterSection :title="$t('filters.status')">
        <div class="fdr__segment">
          <button class="fdr__segment-btn" :class="{ 'fdr__segment-btn--active': filterStore.status === '' }"        @click="filterStore.status = ''">{{ $t('filters.statusAll') }}</button>
          <button class="fdr__segment-btn" :class="{ 'fdr__segment-btn--active': filterStore.status === 'checked' }" @click="filterStore.status = 'checked'">{{ $t('filters.statusChecked') }}</button>
          <button class="fdr__segment-btn" :class="{ 'fdr__segment-btn--active': filterStore.status === 'pending' }" @click="filterStore.status = 'pending'">{{ $t('filters.statusPending') }}</button>
        </div>
      </TransactionFilterSection>

      <!-- Récurrence -->
      <TransactionFilterSection :title="$t('filters.recurring')">
        <div class="fdr__segment">
          <button class="fdr__segment-btn" :class="{ 'fdr__segment-btn--active': filterStore.recurring === null }"  @click="filterStore.recurring = null">{{ $t('filters.recurringAll') }}</button>
          <button class="fdr__segment-btn" :class="{ 'fdr__segment-btn--active': filterStore.recurring === true }"  @click="filterStore.recurring = true">{{ $t('filters.recurringYes') }}</button>
          <button class="fdr__segment-btn" :class="{ 'fdr__segment-btn--active': filterStore.recurring === false }" @click="filterStore.recurring = false">{{ $t('filters.recurringNo') }}</button>
        </div>
      </TransactionFilterSection>

      <!-- Réinitialiser -->
      <button v-if="filterStore.activeCount > 0" class="fdr__reset" @click="filterStore.reset()">
        {{ $t('filters.reset') }}
      </button>

    </div>
  </AppDrawer>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight, Check } from 'lucide-vue-next'
import { usePeriodStore }  from '~/stores/usePeriodStore'
import { useFilterStore }  from '~/stores/useFilterStore'
import { useCategoryStore, TYPE_COLOR  } from '~/stores/useCategoryStore'
import { getIcon }         from '~/utils/iconRegistry'
import type { TransactionType } from '~/types'

const open = defineModel<boolean>({ required: true })

const periodStore   = usePeriodStore()
const filterStore   = useFilterStore()
const categoryStore = useCategoryStore()

const TYPES: TransactionType[] = ['depense', 'revenu', 'epargne']

// Catégories visibles : filtrées par types sélectionnés (ou toutes si aucun type)
const visibleCategories = computed(() =>
  filterStore.types.length
    ? categoryStore.categories.filter(c => filterStore.types.includes(c.type))
    : categoryStore.categories
)

const visibleSubcategories = computed(() =>
  visibleCategories.value
    .filter(c => filterStore.categories.includes(c.name))
    .flatMap(c => c.subcategories)
)

// Nettoyage quand un type est décoché
watch(() => filterStore.types, (types) => {
  if (!types.length) return

  // Retirer les catégories sélectionnées qui ne sont plus visibles
  const visibleCatNames = new Set(visibleCategories.value.map(c => c.name))
  filterStore.categories = filterStore.categories.filter(n => visibleCatNames.has(n))

  // Retirer les sous-catégories orphelines
  const visibleSubNames = new Set(
    visibleCategories.value.flatMap(c => c.subcategories.map(s => s.name))
  )
  filterStore.subcategories = filterStore.subcategories.filter(n => visibleSubNames.has(n))
}, { deep: true })
</script>

<style scoped lang="scss">
.fdr {
  display: flex;
  flex-direction: column;
  gap: 28px;

  // ── Chips (type) ──────────────────────────────────────────────
  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__chip {
    padding: 7px 16px;
    border-radius: 99px;
    font-size: 13px;
    font-weight: 500;
    border: 1.5px solid var(--color-border);
    color: var(--color-text-muted);
    transition: all $transition-fast;

    &--active {
      font-weight: 600;
    }
  }

  // ── Segment (statut / récurrence) ────────────────────────────
  &__segment {
    display: flex;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: 3px;
    gap: 2px;
  }

  &__segment-btn {
    flex: 1;
    padding: 9px 4px;
    border-radius: calc(var(--radius-md) - 2px);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-muted);
    text-align: center;
    transition: all $transition-fast;

    &--active {
      background: var(--color-bg-card);
      color: var(--color-text-primary);
      font-weight: 600;
    }
  }

  // ── Année ─────────────────────────────────────────────────────
  &__year-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: 4px;
  }

  &__year-arrow {
    width: 40px;
    height: 40px;
    border-radius: calc(var(--radius-md) - 2px);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-primary);
    transition: background $transition-fast, opacity $transition-fast;

    &:active { background: var(--color-border-subtle); }
    &:disabled { opacity: 0.25; pointer-events: none; }
  }

  &__year-label {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  // ── Liste (catégories / sous-catégories) ─────────────────────
  &__list {
    display: flex;
    flex-direction: column;
  }

  &__list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    font-size: 14px;
    color: var(--color-text-secondary);
    transition: color $transition-fast;

    & + & { border-top: 1px solid var(--color-border-subtle); }

    &--active { color: var(--color-text-primary); font-weight: 500; }
  }

  &__list-item-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__cat-icon {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__check {
    color: var(--color-accent);
    flex-shrink: 0;
  }

  // ── Réinitialiser ─────────────────────────────────────────────
  &__reset {
    width: 100%;
    padding: 14px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    color: #ef4444;
    background: var(--color-bg-elevated);
    text-align: center;
    transition: opacity $transition-fast;

    &:active { opacity: 0.7; }
  }
}
</style>
