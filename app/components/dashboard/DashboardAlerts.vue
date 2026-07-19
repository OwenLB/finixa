<template>
  <div v-if="uncategorizedCount > 0 || lateCount > 0" class="dash-alerts">
    <!-- Les deux alertes actives : bannière fusionnée -->
    <AlertBanner
      v-if="uncategorizedCount > 0 && lateCount > 0"
      :items="[
        { count: uncategorizedCount, label: $t('categorization.banner.label', uncategorizedCount) },
        { count: lateCount,          label: $t('reconciliation.banner.label', lateCount) },
      ]"
      :cta="$t('reconciliation.banner.cta')"
      color="#6366f1"
      @action="goToTransactions"
    />
    <!-- Seulement non catégorisées -->
    <AlertBanner
      v-else-if="uncategorizedCount > 0"
      :count="uncategorizedCount"
      :label="$t('categorization.banner.label', uncategorizedCount)"
      :cta="$t('reconciliation.banner.cta')"
      color="#f59e0b"
      @action="goToUncategorized"
    />
    <!-- Seulement en retard -->
    <AlertBanner
      v-else-if="lateCount > 0"
      :count="lateCount"
      :label="$t('reconciliation.banner.label', lateCount)"
      :cta="$t('reconciliation.banner.cta')"
      color="#ef4444"
      @action="goToLate"
    />
  </div>
</template>

<script setup lang="ts">
import AlertBanner from '~/components/ui/AlertBanner.vue'
import { useTransactionStore } from '~/stores/useTransactionStore'
import { useFilterStore }      from '~/stores/useFilterStore'
import { PENDING_LATE_DAYS }   from '~/utils/constants'

const txStore     = useTransactionStore()
const filterStore = useFilterStore()
const router      = useRouter()

const uncategorizedCount = computed(() => txStore.uncategorizedTotal)

const lateCount = computed(() => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - PENDING_LATE_DAYS)
  cutoff.setHours(0, 0, 0, 0)
  return txStore.transactions.filter(tx =>
    !tx.virtual &&
    tx.status === 'pending' &&
    new Date(tx.date.slice(0, 10) + 'T12:00:00') < cutoff
  ).length
})

function goToTransactions() {
  filterStore.reset()
  router.push('/transactions')
}

function goToUncategorized() {
  filterStore.reset()
  filterStore.uncategorized = true
  router.push('/transactions')
}

function goToLate() {
  filterStore.reset()
  filterStore.status = 'pending'
  router.push('/transactions')
}
</script>

<style scoped lang="scss">
.dash-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 $page-padding-x;
}
</style>
