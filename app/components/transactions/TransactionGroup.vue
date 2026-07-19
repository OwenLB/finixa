<template>
  <div class="tx-group">
    <div class="tx-group__header">
      <span class="tx-group__date">{{ group.label }}</span>
      <span
        class="tx-group__total"
        :class="group.total > 0 ? 'tx-group__total--positive' : 'tx-group__total--negative'"
      >
        {{ fmtTotal(group.total) }}
      </span>
    </div>

    <div class="tx-group__list">
      <TransactionItem
        v-for="tx in group.transactions"
        :key="tx.id"
        v-memo="[tx.id, tx.status, tx.category, tx.categorized, tx.amount, tx.name, tx.virtual, tx.date, selectionStore.active, selectionStore.isSelected(tx.id)]"
        :tx="tx"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TransactionItem from '~/components/transactions/TransactionItem.vue'
import type { TxGroup } from '~/types'
import { useSelectionStore } from '~/stores/useSelectionStore'

defineProps<{ group: TxGroup }>()

const selectionStore          = useSelectionStore()
const { fmtAmount: fmtTotal } = useCurrency()
</script>

<style scoped lang="scss">
.tx-group {
  content-visibility: auto;
  contain-intrinsic-size: 0 200px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0 4px;
    border-bottom: 1px solid var(--color-border-subtle);
    margin-bottom: 0;
  }

  &__date {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  &__total {
    font-size: 12px;
    font-weight: 600;

    &--positive { color: var(--color-success); }
    &--negative { color: var(--color-text-secondary); }
  }

  &__list {
    display: flex;
    flex-direction: column;
  }
}
</style>
