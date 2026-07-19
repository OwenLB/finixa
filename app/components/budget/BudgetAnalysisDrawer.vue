<template>
  <AppDrawer v-model="open" :title="$t('budgetAnalysis.title')">

    <!-- Sélecteur de période -->
    <div class="ba__windows">
      <button
        v-for="w in WINDOWS"
        :key="w"
        class="ba__window"
        :class="{ 'ba__window--active': months === w }"
        @click="setWindow(w)"
      >
        {{ $t('budgetAnalysis.months', { n: w }) }}
      </button>
    </div>

    <p class="ba__subtitle">
      {{ $t('budgetAnalysis.basis', { n: activeMonths }) }}
    </p>

    <!-- Chargement -->
    <div v-if="loading" class="ba__loading">
      <UiAppSkeleton v-for="i in 4" :key="i" height="56px" border-radius="10px" />
    </div>

    <!-- Pas assez de données -->
    <div v-else-if="activeMonths === 0 || rows.length === 0" class="ba__empty">
      <BarChart3 :size="36" />
      <p>{{ $t('budgetAnalysis.empty') }}</p>
    </div>

    <!-- Résultats -->
    <template v-else>
      <div class="ba__list">
        <div v-for="row in rows" :key="row.subId" class="ba__row">
          <div class="ba__row-main">
            <span class="ba__dot" :style="{ background: row.color }" />
            <div class="ba__row-text">
              <span class="ba__name">{{ row.name }}</span>
              <span class="ba__values">
                {{ row.currentBudget != null && row.currentBudget > 0 ? fmt(row.currentBudget) : $t('budgetAnalysis.noBudget') }}
                <ArrowRight :size="11" class="ba__arrow" />
                <strong>{{ fmt(row.suggested) }}</strong>
              </span>
            </div>
          </div>

          <div class="ba__row-action">
            <span
              v-if="row.delta !== 0"
              class="ba__delta"
              :class="row.delta > 0 ? 'ba__delta--up' : 'ba__delta--down'"
            >
              {{ row.delta > 0 ? '+' : '−' }}{{ fmt(Math.abs(row.delta)) }}
            </span>
            <span v-else class="ba__ok">
              <Check :size="13" />
            </span>
            <button
              v-if="row.delta !== 0"
              class="ba__apply"
              :disabled="applyingId === row.subId || applyingAll"
              :aria-label="$t('budgetAnalysis.apply')"
              @click="applyRow(row)"
            >
              <Loader2 v-if="applyingId === row.subId" :size="14" class="ba__spinner" />
              <Check v-else :size="14" />
            </button>
          </div>
        </div>
      </div>

      <button
        v-if="adjustableCount > 0"
        class="ba__btn"
        :disabled="applyingAll"
        @click="applyAll"
      >
        <Loader2 v-if="applyingAll" :size="16" class="ba__spinner" />
        {{ $t('budgetAnalysis.applyAll', { n: adjustableCount }) }}
      </button>
    </template>

    <p v-if="error" class="ba__error">{{ error }}</p>
  </AppDrawer>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { BarChart3, ArrowRight, Check, Loader2 } from 'lucide-vue-next'
import { useBudgetAnalysis, type AnalysisWindow } from '~/composables/useBudgetAnalysis'

const open = defineModel<boolean>({ required: true })

const WINDOWS: AnalysisWindow[] = [3, 6, 12]

const { fmt } = useCurrency()

const {
  months, loading, error, activeMonths, applyingId, applyingAll,
  rows, adjustableCount, run, setWindow, applyRow, applyAll,
} = useBudgetAnalysis()

watch(open, (v) => { if (v) void run() })
</script>

<style scoped lang="scss">
.ba {
  &__windows {
    display: flex;
    gap: 6px;
    padding: 4px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
  }

  &__window {
    flex: 1;
    padding: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-muted);
    border-radius: var(--radius-sm);
    transition: background $transition-fast, color $transition-fast;

    &--active {
      background: var(--color-bg-card);
      color: var(--color-text-primary);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }
  }

  &__subtitle {
    margin: 12px 0 8px;
    font-size: 12px;
    color: var(--color-text-muted);
    text-align: center;
  }

  &__loading {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 32px 0;
    color: var(--color-text-muted);
    text-align: center;

    p { font-size: 14px; color: var(--color-text-secondary); }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 50vh;
    overflow-y: auto;
    margin-bottom: 12px;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 8px;
    border-bottom: 1px solid var(--color-border-subtle);

    &:last-child { border-bottom: none; }
  }

  &__row-main {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__row-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__values {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;

    strong { color: var(--color-text-primary); font-weight: 700; }
  }

  &__arrow { color: var(--color-border); flex-shrink: 0; }

  &__row-action {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__delta {
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;

    &--up   { color: #ef4444; }
    &--down { color: var(--color-success); }
  }

  &__ok { color: var(--color-success); display: inline-flex; }

  &__apply {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-accent) 14%, transparent);
    color: var(--color-accent);
    transition: background $transition-fast, opacity $transition-fast;

    &:disabled { opacity: 0.4; }
    &:active:not(:disabled) { background: color-mix(in srgb, var(--color-accent) 26%, transparent); }
  }

  &__btn {
    @include btn-action;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    &:disabled { opacity: 0.5; pointer-events: none; }
  }

  &__spinner { animation: spin 0.7s linear infinite; }

  &__error {
    margin-top: 10px;
    font-size: 13px;
    color: #ef4444;
    text-align: center;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
