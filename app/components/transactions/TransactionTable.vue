<template>
  <div class="tx-table-wrapper">
    <table class="tx-table">
      <thead class="tx-table__head">
        <tr>
          <th class="tx-table__th tx-table__th--icon" />
          <th class="tx-table__th">Libellé</th>
          <th class="tx-table__th">Catégorie</th>
          <th class="tx-table__th">Date</th>
          <th class="tx-table__th tx-table__th--right">Montant</th>
          <th class="tx-table__th tx-table__th--status" />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="tx in flatTransactions"
          :key="tx.id"
          v-memo="[tx.id, tx.amount, tx.name, tx.status, tx.category, tx.categorized, tx.virtual, selectionStore.isSelected(tx.id), selectionStore.active, togglingIds.has(tx.id)]"
          class="tx-table__row"
          :class="{
            'tx-table__row--selected': selectionStore.isSelected(tx.id),
          }"
          @click="onRow(tx)"
        >
          <!-- Icône -->
          <td class="tx-table__td tx-table__td--icon">
            <div
              class="tx-table__icon"
              :class="{
                'tx-table__icon--selectable': selectionStore.active,
                'tx-table__icon--selected':   selectionStore.isSelected(tx.id),
              }"
              :style="selectionStore.active ? {} : { background: getIcon(tx).iconBg }"
              @click.stop="selectionStore.active && selectionStore.toggle(tx.id)"
            >
              <template v-if="selectionStore.active">
                <CheckCircle2 v-if="selectionStore.isSelected(tx.id)" :size="16" />
                <Circle v-else :size="16" />
              </template>
              <template v-else>
                <component :is="getIcon(tx).icon" :size="15" :color="getIcon(tx).iconColor" />
              </template>
            </div>
          </td>

          <!-- Libellé -->
          <td class="tx-table__td">
            <div class="tx-table__name-row">
              <span class="tx-table__name">{{ tx.name }}</span>
              <RefreshCw v-if="tx.virtual" :size="11" class="tx-table__badge" />
              <span     v-if="isIncomplete(tx)" class="tx-table__dot tx-table__dot--warning" />
              <span     v-if="isLate(tx)"       class="tx-table__dot tx-table__dot--danger" />
            </div>
          </td>

          <!-- Catégorie -->
          <td class="tx-table__td tx-table__td--secondary">
            <span :class="{ 'tx-table__uncategorized': !tx.categorized }">
              {{ tx.categorized ? getCategoryLabel(tx) : $t(`types.${tx.type}`) }}
            </span>
          </td>

          <!-- Date -->
          <td class="tx-table__td tx-table__td--secondary">
            {{ formatDate(tx.date) }}
          </td>

          <!-- Montant -->
          <td class="tx-table__td tx-table__td--right">
            <span
              class="tx-table__amount"
              :class="tx.amount > 0 ? 'tx-table__amount--positive' : ''"
            >
              {{ fmtAmount(tx.amount) }}
            </span>
          </td>

          <!-- Statut -->
          <td class="tx-table__td tx-table__td--status" @click.stop>
            <button
              class="tx-table__status-btn"
              :class="`tx-table__status-btn--${tx.status}`"
              :disabled="togglingIds.has(tx.id)"
              :aria-label="$t('a11y.toggleStatus')"
              @click.stop="onToggle(tx)"
            >
              <CheckCircle2 v-if="tx.status === 'checked'" :size="15" />
              <Circle       v-else                         :size="15" />
            </button>
          </td>
        </tr>

        <tr v-if="flatTransactions.length === 0">
          <td colspan="6" class="tx-table__empty">{{ $t('transactions.empty') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw, CheckCircle2, Circle } from 'lucide-vue-next'
import type { TxGroup, Transaction } from '~/types'
import { getCategoryIcon } from '~/utils/categoryIcon'
import { useTransactionStore } from '~/stores/useTransactionStore'
import { useCategoryStore }    from '~/stores/useCategoryStore'
import { useSelectionStore }   from '~/stores/useSelectionStore'

const props = defineProps<{ groups: TxGroup[] }>()

const { t }          = useI18n()
const store          = useTransactionStore()
const categoryStore  = useCategoryStore()
const selectionStore = useSelectionStore()
const toast          = useToast()
const { fmtAmount }  = useCurrency()
const addPanel       = useAddPanel()

const flatTransactions = computed<Transaction[]>(() =>
  props.groups.flatMap(g => g.transactions)
)

// Cache par valeur de tx.category — évite n×m lookups répétés dans le template
const txIconCache = computed(() => {
  const map = new Map<string, ReturnType<typeof getCategoryIcon>>()
  for (const tx of flatTransactions.value) {
    if (!map.has(tx.category)) {
      map.set(tx.category, getCategoryIcon(tx.category, categoryStore.categories))
    }
  }
  return map
})

const togglingIds = reactive(new Set<string>())

function getIcon(tx: Transaction) {
  return txIconCache.value.get(tx.category) ?? getCategoryIcon(tx.category, categoryStore.categories)
}

function getCategoryLabel(tx: Transaction) {
  return categoryStore.subcategoryLookup.get(tx.category) ?? ''
}

function isIncomplete(tx: Transaction) {
  return tx.amount === 0 || !tx.date || !tx.categorized
}

function isLate(tx: Transaction) {
  if (tx.virtual || tx.status === 'checked') return false
  const txDate = new Date(tx.date.slice(0, 10) + 'T12:00:00')
  const today  = new Date()
  today.setHours(0, 0, 0, 0)
  return today.getTime() - txDate.getTime() > 5 * 24 * 60 * 60 * 1000
}

function formatDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function onRow(tx: Transaction) {
  if (selectionStore.active) {
    selectionStore.toggle(tx.id)
    return
  }
  addPanel.openEdit(tx.id)
}

async function onToggle(tx: Transaction) {
  if (togglingIds.has(tx.id)) return
  togglingIds.add(tx.id)
  try {
    const updated = await store.toggleStatus(tx.id)
    if (!updated) return
    if (updated.status === 'checked') {
      toast.show(t('toast.txChecked'), { sub: updated.name })
    } else {
      toast.show(t('toast.txUnchecked'), { sub: updated.name, type: 'info' })
    }
  } finally {
    togglingIds.delete(tx.id)
  }
}
</script>

<style scoped lang="scss">
.tx-table-wrapper {
  overflow-x: auto;
  padding: 0 24px 32px;
}

.tx-table {
  width: 100%;
  border-collapse: collapse;

  // ── En-tête ──────────────────────────────────────────────────
  &__head {
    border-bottom: 1px solid var(--color-border);
  }

  &__th {
    padding: 8px 10px;
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    white-space: nowrap;

    &--icon   { width: 44px; padding: 8px 6px; }
    &--status { width: 40px; }
    &--right  { text-align: right; }
  }

  // ── Lignes ────────────────────────────────────────────────────
  &__row {
    border-bottom: 1px solid var(--color-border-subtle);
    cursor: pointer;
    transition: background $transition-fast;

    &:hover { background: var(--color-bg-elevated); }
    &--selected { background: var(--color-bg-elevated); }
  }

  &__td {
    padding: 10px 10px;
    font-size: 13px;
    color: var(--color-text-primary);
    vertical-align: middle;

    &--icon     { padding: 10px 6px; width: 44px; }
    &--secondary { color: var(--color-text-secondary); font-size: 12px; }
    &--right    { text-align: right; }
    &--status   { width: 40px; text-align: center; }
  }

  // ── Icône catégorie ───────────────────────────────────────────
  &__icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background $transition-fast;

    &--selectable {
      background: var(--color-bg-elevated);
      color: var(--color-text-muted);
    }

    &--selected {
      background: var(--color-accent);
      color: var(--color-accent-fg);
    }
  }

  // ── Libellé ───────────────────────────────────────────────────
  &__name-row {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  &__name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 240px;
  }

  &__badge {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;

    &--warning { background: #f59e0b; }
    &--danger  { background: #ef4444; }
  }

  // ── Catégorie non catégorisée ─────────────────────────────────
  &__uncategorized { color: #f59e0b; }

  // ── Montant ───────────────────────────────────────────────────
  &__amount {
    font-weight: 700;
    font-size: 13px;
    color: var(--color-text-primary);

    &--positive { color: var(--color-success); }
  }

  // ── Bouton statut ─────────────────────────────────────────────
  &__status-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    padding: 4px;
    border-radius: 50%;
    transition: opacity $transition-fast;

    &:hover   { opacity: 0.7; }
    &:active  { opacity: 0.5; }
    &--checked { color: var(--color-success); }
    &--pending { color: var(--color-text-muted); }
  }

  // ── État vide ─────────────────────────────────────────────────
  &__empty {
    padding: 40px;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 13px;
  }
}
</style>
