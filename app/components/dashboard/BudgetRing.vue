<template>
  <div class="budget-ring">

    <GaugeChart
      :progress="progressReel"
      :preview-progress="progressPrev"
      :stroke-width="4"
      :instant="instant"
      class="budget-ring__gauge"
    />

    <div class="budget-ring__stats">
      <div class="budget-ring__stat">
        <span class="budget-ring__stat-value">{{ fmt(props.budget) }}</span>
        <span class="budget-ring__stat-label">Budget</span>
      </div>
      <div class="budget-ring__stat">
        <span class="budget-ring__stat-value budget-ring__stat-value--lg">{{ fmt(props.soldePrev) }}</span>
        <span class="budget-ring__stat-label">Prévisionnel</span>
      </div>
      <div class="budget-ring__stat">
        <span class="budget-ring__stat-value">{{ fmt(props.soldeReel) }}</span>
        <span class="budget-ring__stat-label">Solde réel</span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import GaugeChart from '~/components/ui/GaugeChart.vue'

const props = defineProps<{
  budget:    number   // revenu total (référence gauge)
  spentReel: number   // dépenses pointées
  spentPrev: number   // toutes dépenses
  soldeReel: number   // revenus pointés - dépenses pointées
  soldePrev: number   // tous revenus - toutes dépenses
  instant?:  boolean  // désactive la transition de la jauge
}>()

const base        = computed(() => props.budget || 1)
const progressReel = computed(() => props.spentReel / base.value)
const progressPrev = computed(() => props.spentPrev / base.value)

const { fmt } = useCurrency()
</script>

<style scoped lang="scss">
.budget-ring {
  // Mobile : superposition gauge + stats dans la même cellule grid
  display: grid;
  > * { grid-area: 1 / 1; }

  // Desktop : flex-column, stats en dessous (plus de superposition)
  @media (min-width: $breakpoint-lg) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  &__gauge {
    width: 220px;
    justify-self: center;
    margin-top: -14px;

    @media (min-width: $breakpoint-lg) {
      margin-top: 0;
    }
  }

  &__stats {
    display: flex;
    align-items: center;
    padding-top: 14px;

    @media (min-width: $breakpoint-lg) {
      padding-top: 0;
      // Plus larges que la gauge maintenant qu'elles ne la couvrent plus
      min-width: 280px;
    }
  }

  &__stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;

    &-value {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
      white-space: nowrap;

      &--lg {
        font-size: 1.4rem;
        font-weight: 700;
      }
    }

    &-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--color-text-muted);
    }
  }
}
</style>
