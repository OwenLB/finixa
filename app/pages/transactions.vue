<template>
  <PullToRefresh :refresh="refreshAll">
  <div class="transactions">

    <div class="transactions__header">
      <PageHeader :title="$t('transactions.title')">
        <template #default>
          <!-- Desktop + sélection active : toolbar de sélection dans le header -->
          <div v-if="isDesktop && selectionStore.active" class="tx-sel-toolbar">
            <button class="tx-sel-toolbar__exit" :aria-label="$t('common.close')" @click="selectionStore.exit()">
              <X :size="16" />
            </button>
            <span class="tx-sel-toolbar__count">
              {{ selectionStore.selectedIds.length }}
              {{ $t('transactions.selected', selectionStore.selectedIds.length) }}
            </span>

            <div class="tx-sel-toolbar__spacer" />

            <div class="tx-sel-toolbar__actions">
              <button
                class="tx-sel-toolbar__btn"
                :disabled="actions.loading.value"
                @click="actions.pointer()"
              >
                <CheckCircle2 :size="14" />
                {{ $t('selection.pointer') }}
              </button>
              <button
                class="tx-sel-toolbar__btn"
                :disabled="actions.loading.value"
                @click="actions.openCategorize()"
              >
                <Tag :size="14" />
                {{ $t('selection.categorize') }}
              </button>
              <button
                class="tx-sel-toolbar__btn tx-sel-toolbar__btn--danger"
                :disabled="actions.loading.value"
                @click="actions.remove()"
              >
                <Trash2 :size="14" />
                {{ $t('selection.delete') }}
              </button>
            </div>
          </div>

          <!-- Toolbar normale -->
          <template v-else>
            <PeriodSelector />
            <TransactionSearch v-model="search" />
            <TransactionFilters @open-filters="filterDrawerOpen = true" />
          </template>
        </template>
      </PageHeader>
    </div>

    <TransactionsListSkeleton v-if="store.loading && store.transactions.length === 0" />

    <template v-else>
      <div class="transactions__banners">
        <CategorizationEntryBanner
          :count="uncategorizedCount"
          @start="queueOpen = true"
        />
        <AlertBanner
          :count="lateCount"
          :label="$t('reconciliation.banner.label', lateCount)"
          :cta="$t('reconciliation.banner.cta')"
          color="#ef4444"
          @action="onLateBanner"
        />
      </div>

      <!-- Vue tableau (desktop) -->
      <TransactionTable v-if="isDesktop" :groups="filteredGroups" />

      <!-- Vue liste groupée (mobile) -->
      <div v-else class="transactions__list">
        <TransactionGroup
          v-for="group in filteredGroups"
          :key="group.dateKey"
          :group="group"
        />
        <div v-if="filteredGroups.length === 0" class="transactions__empty">
          <p class="transactions__empty-title">{{ $t('transactions.empty') }}</p>
          <p class="transactions__empty-hint">{{ $t('transactions.emptyHint') }}</p>
        </div>
      </div>
    </template>

    <TransactionFilterDrawer v-model="filterDrawerOpen" />

    <!-- Barre de sélection mobile uniquement -->
    <TransactionSelectionBar v-if="!isDesktop" :all-ids="filteredIds" />

    <!-- Drawer catégorisation (partagé desktop + mobile via singleton) -->
    <TransactionCategorizeDrawer
      v-model="actions.categorizeOpen.value"
      @apply="actions.applyCategorize"
    />

    <CategorizationQueue v-model="queueOpen" />

  </div>
  </PullToRefresh>
</template>

<script setup lang="ts">
import { X, CheckCircle2, Tag, Trash2 } from 'lucide-vue-next'
import PullToRefresh  from '~/components/PullToRefresh.vue'
import PageHeader     from '~/components/PageHeader.vue'
import PeriodSelector from '~/components/PeriodSelector.vue'
import TransactionSearch           from '~/components/transactions/TransactionSearch.vue'
import TransactionFilters          from '~/components/transactions/TransactionFilters.vue'
import TransactionGroup            from '~/components/transactions/TransactionGroup.vue'
import TransactionTable            from '~/components/transactions/TransactionTable.vue'
import TransactionFilterDrawer     from '~/components/transactions/TransactionFilterDrawer.vue'
import TransactionSelectionBar     from '~/components/transactions/TransactionSelectionBar.vue'
import TransactionCategorizeDrawer from '~/components/transactions/TransactionCategorizeDrawer.vue'
import CategorizationEntryBanner   from '~/components/categorization/CategorizationEntryBanner.vue'
import CategorizationQueue         from '~/components/categorization/CategorizationQueue.vue'
import AlertBanner                 from '~/components/ui/AlertBanner.vue'
import { useTransactionStore }     from '~/stores/useTransactionStore'
import { useSelectionStore }       from '~/stores/useSelectionStore'
import { PENDING_LATE_DAYS }       from '~/utils/constants'
import { useFilterStore }          from '~/stores/useFilterStore'
import { useTransactionFilter }    from '~/composables/useTransactionFilter'
import { useSelectionActions }     from '~/composables/useSelectionActions'

const { refreshAll } = usePageRefresh()
const store          = useTransactionStore()
const selectionStore = useSelectionStore()
const filterStore    = useFilterStore()
const actions        = useSelectionActions()
const route          = useRoute()
const { show }       = useToast()
const { isDesktop }  = useBreakpoint()

const search           = ref('')
const filterDrawerOpen = ref(false)
const queueOpen        = ref(false)

watch(() => store.error, (err) => {
  if (err) show(err, { type: 'error' })
})

onMounted(() => {
  // Le store est déjà chargé par app.vue ; on rafraîchit en arrière-plan sans
  // bloquer l'affichage du cache (stale-while-revalidate).
  void store.fetch()
  if (route.query.queue === 'open') queueOpen.value = true
})

const { filteredGroups, filteredIds } = useTransactionFilter(search)

const uncategorizedCount = computed(() => store.uncategorizedTotal)

const lateCount = computed(() => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - PENDING_LATE_DAYS)
  cutoff.setHours(0, 0, 0, 0)
  return store.transactions.filter(tx =>
    !tx.virtual &&
    tx.status === 'pending' &&
    new Date(tx.date.slice(0, 10) + 'T12:00:00') < cutoff
  ).length
})

function onLateBanner() {
  filterStore.reset()
  filterStore.status = 'pending'
}
</script>

<style scoped lang="scss">
.transactions {
  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--color-bg);
  }

  &__banners {
    padding: 8px $page-padding-x 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__list {
    padding: 0 $page-padding-x;
    display: flex;
    flex-direction: column;
  }

  &__empty {
    text-align: center;
    padding: 48px 24px;
  }

  &__empty-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  &__empty-hint {
    margin-top: 6px;
    font-size: 13px;
    color: var(--color-text-muted);
  }
}

// ── Toolbar sélection desktop ──────────────────────────────────
.tx-sel-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;

  &__exit {
    @include btn-icon(28px);
    color: var(--color-text-muted);
    flex-shrink: 0;
    &:hover { color: var(--color-text-primary); }
  }

  &__count {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
  }

  &__spacer { flex: 1; }

  &__actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 11px;
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary);
    background: var(--color-bg-elevated);
    transition: background $transition-fast, color $transition-fast;
    white-space: nowrap;

    &:hover:not(:disabled) {
      background: var(--color-border);
      color: var(--color-text-primary);
    }
    &:disabled { opacity: 0.4; cursor: not-allowed; }

    &--danger {
      color: var(--color-danger);
      &:hover:not(:disabled) {
        background: rgba(248, 113, 113, 0.12);
        color: var(--color-danger);
      }
    }
  }
}
</style>
