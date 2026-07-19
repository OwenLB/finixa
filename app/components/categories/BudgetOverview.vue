<template>
  <div class="bov">
    <!-- Ligne principale : à allouer vs alloué -->
    <div class="bov__header">
      <div class="bov__amounts">
        <span class="bov__label">{{ $t('budgetOverview.label') }}</span>
        <div class="bov__figures">
          <span class="bov__allocated">{{ fmt(totalAllocated) }}</span>
          <span class="bov__sep">/</span>
          <span class="bov__total">{{ fmt(totalRevenu) }}</span>
        </div>
      </div>

      <!-- Badge statut -->
      <div class="bov__badge" :class="badgeClass">
        <component :is="badgeIcon" :size="12" />
        {{ badgeLabel }}
      </div>
    </div>

    <!-- Progress bar -->
    <UiBudgetProgressBar
      :value="totalAllocated"
      :max="totalRevenu"
      :color="barColor"
    />

    <!-- Message -->
    <p class="bov__message" :class="messageClass">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { TrendingDown, TrendingUp, CheckCircle } from 'lucide-vue-next'
import { useCategoryStore } from '~/stores/useCategoryStore'

const { t }  = useI18n()
const store  = useCategoryStore()

const totalRevenu    = computed(() => store.budgetTotals.get('revenu')  ?? 0)
const totalDepense   = computed(() => store.budgetTotals.get('depense') ?? 0)
const totalEpargne   = computed(() => store.budgetTotals.get('epargne') ?? 0)
const totalAllocated = computed(() => totalDepense.value + totalEpargne.value)
const remaining      = computed(() => totalRevenu.value - totalAllocated.value)
const overflow       = computed(() => Math.max(0, totalAllocated.value - totalRevenu.value))

const status = computed<'ok' | 'under' | 'over'>(() => {
  if (overflow.value > 0) return 'over'
  if (remaining.value > 50) return 'under'
  return 'ok'
})

const barColor = computed(() => {
  if (status.value === 'over')  return '#f97316'
  if (status.value === 'ok')    return '#34d399'
  return '#818cf8'
})

const badgeClass = computed(() => ({
  'bov__badge--ok':    status.value === 'ok',
  'bov__badge--under': status.value === 'under',
  'bov__badge--over':  status.value === 'over',
}))

const messageClass = computed(() => ({
  'bov__message--ok':    status.value === 'ok',
  'bov__message--under': status.value === 'under',
  'bov__message--over':  status.value === 'over',
}))

const badgeIcon = computed(() => {
  if (status.value === 'over')  return TrendingUp
  if (status.value === 'under') return TrendingDown
  return CheckCircle
})

const badgeLabel = computed(() => {
  if (status.value === 'over')  return t('budgetOverview.badgeOver')
  if (status.value === 'under') return t('budgetOverview.badgeUnder')
  return t('budgetOverview.badgeOk')
})

const message = computed(() => {
  if (status.value === 'over')
    return t('budgetOverview.messageOver',  { amount: fmt(overflow.value) })
  if (status.value === 'under')
    return t('budgetOverview.messageUnder', { amount: fmt(remaining.value) })
  return t('budgetOverview.messageOk')
})

const { fmt } = useCurrency()
</script>

<style scoped lang="scss">
.bov {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  margin: 0 $page-padding-x;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  &__amounts {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  &__figures {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  &__allocated {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__sep {
    font-size: 14px;
    color: var(--color-text-muted);
  }

  &__total {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-muted);
  }

  &__badge {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 99px;
    flex-shrink: 0;

    &--ok    { background: #34d39920; color: #34d399; }
    &--under { background: #818cf820; color: #818cf8; }
    &--over  { background: #ef444420; color: #ef4444; }
  }

  &__message {
    font-size: 12px;
    font-weight: 500;

    &--ok    { color: #34d399; }
    &--under { color: var(--color-text-muted); }
    &--over  { color: #ef4444; }
  }
}
</style>
