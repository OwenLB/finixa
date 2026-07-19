<template>
  <div class="rcard" :style="{ borderLeftColor: accent }">
    <slot name="lead" />

    <div class="rcard__body">
      <!-- Ligne 1 : nom + indicateur (confiance) -->
      <div class="rcard__row1">
        <span class="rcard__name">{{ name }}</span>
        <slot name="indicator" />
      </div>

      <!-- Ligne 2 : méta (date / fréquence) + montant -->
      <div class="rcard__row2">
        <div class="rcard__meta"><slot name="meta" /></div>
        <span class="rcard__amount" :class="`rcard__amount--${amountType}`">{{ amount }}</span>
      </div>

      <!-- Ligne 3 : catégorie -->
      <div v-if="categoryLabel" class="rcard__row3">
        <span v-if="icon" class="rcard__cat-icon" :style="{ background: icon.iconBg }">
          <component :is="icon.icon" :size="9" :color="icon.iconColor" />
        </span>
        <span class="rcard__cat-name" :class="{ 'rcard__cat-name--missing': missing }">{{ categoryLabel }}</span>
      </div>
    </div>

    <div v-if="$slots.actions" class="rcard__actions"><slot name="actions" /></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getCategoryIcon } from '~/utils/categoryIcon'
import { useCategoryStore } from '~/stores/useCategoryStore'
import type { TransactionType } from '~/types'

const props = withDefaults(defineProps<{
  name:           string
  amount:         string                      // déjà formaté + signé
  amountType:     TransactionType
  categoryId?:    string
  categoryLabel?: string
  missing?:       boolean
}>(), { categoryId: '', categoryLabel: '', missing: false })

const categoryStore = useCategoryStore()

const icon = computed(() =>
  props.categoryId ? getCategoryIcon(props.categoryId, categoryStore.categories) : null,
)

const accent = computed(() =>
  icon.value ? icon.value.iconColor : (props.amountType === 'depense' ? '#ef4444' : 'var(--color-success)'),
)
</script>

<style scoped lang="scss">
.rcard {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 14px;
  border: 1px solid var(--color-border-subtle);
  border-left: 3px solid transparent;
  border-radius: var(--radius-md);

  &__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }

  &__row1 { display: flex; align-items: center; gap: 6px; overflow: hidden; }

  &__name {
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__row2 { display: flex; align-items: center; justify-content: space-between; gap: 8px; }

  &__meta {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
    font-size: 12px;
    color: var(--color-text-muted);
  }

  &__amount {
    font-size: 16px;
    font-weight: 700;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-primary);

    &--depense { color: #ef4444; }
    &--revenu  { color: var(--color-success); }
  }

  &__row3 { display: flex; align-items: center; gap: 5px; }

  &__cat-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 15px;
    height: 15px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  &__cat-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &--missing { color: #818cf8; }
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
    align-self: center;
  }
}
</style>
