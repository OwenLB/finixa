<template>
  <div class="category-bars">
    <div v-for="cat in categories" :key="cat.label" class="category-bar">
      <span class="category-bar__label">{{ cat.label }}</span>
      <UiBudgetProgressBar :value="barValue(cat)" :max="cat.budget" :color="cat.color" :excess-color="excessColor(cat)" :extra="cat.excludedAmount" :reverse="props.view === 'restant'" :instant="instant" />
      <span class="category-bar__amounts">{{ fmt(displayAmount(cat)) }} / {{ fmt(cat.budget) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ViewMode, FinancialCategory } from '~/types'
import { darkenHex } from '~/utils/colorUtils'

const props = defineProps<{
  categories: FinancialCategory[]
  view:       ViewMode
  instant?:   boolean
}>()

function barValue(cat: FinancialCategory) {
  return props.view === 'depense' ? cat.amount : cat.budget - cat.amount
}

// Le montant affiché inclut la part exclue (désépargne) — comme le segment rouge
// de la barre — pour que le chiffre corresponde à ce qui est dessiné.
function displayAmount(cat: FinancialCategory) {
  return props.view === 'depense'
    ? cat.amount + (cat.excludedAmount ?? 0)
    : cat.budget - cat.amount
}

function excessColor(cat: FinancialCategory): string | undefined {
  return cat.type === 'depense' ? undefined : darkenHex(cat.color)
}

const { fmt } = useCurrency()
</script>

<style scoped lang="scss">
.category-bars {
  display: flex;
}

.category-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0 12px;

  & + & {
    border-left: 1px solid var(--color-border-subtle);
  }

  &:first-child { padding-left: 0; }
  &:last-child  { padding-right: 0; }

  &__label {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary);
    text-align: center;
  }

  .bpb { width: 100%; }

  &__amounts {
    font-size: 11px;
    color: var(--color-text-muted);
    text-align: center;
    white-space: nowrap;
  }
}
</style>
