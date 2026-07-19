<template>
  <div class="ee">
    <div class="ee__mode-toggle">
      <button
        class="ee__mode-btn"
        :class="{ 'ee__mode-btn--active': mode === 'sliders' }"
        @click="mode = 'sliders'"
      >{{ t('envelopes.editor.modeSliders') }}</button>
      <button
        class="ee__mode-btn"
        :class="{ 'ee__mode-btn--active': mode === 'free' }"
        @click="mode = 'free'"
      >{{ t('envelopes.editor.modeFree') }}</button>
    </div>

    <div class="ee__rows">
      <div v-for="item in envelopeItems" :key="item.key" class="ee__row">
        <div class="ee__row-header">
          <span class="ee__row-name" :style="{ color: item.color }">{{ item.label }}</span>
          <div class="ee__row-right">
            <span v-if="mode === 'sliders'" class="ee__row-pct">{{ current[item.key] }}%</span>
            <span v-if="income" class="ee__row-amount">{{ fmt(Math.round((income ?? 0) * current[item.key] / 100)) }}</span>
          </div>
        </div>
        <input
          v-if="mode === 'sliders'"
          type="range"
          class="ee__slider"
          :style="{ accentColor: item.color }"
          :value="current[item.key]"
          min="0"
          max="100"
          step="1"
          @input="onSlider(item.key, +($event.target as HTMLInputElement).value)"
        />
        <div v-else class="ee__free-row">
          <input
            type="number"
            class="ee__free-input"
            min="0"
            max="100"
            :value="current[item.key]"
            @input="current[item.key] = clamp(+($event.target as HTMLInputElement).value)"
          />
          <span class="ee__free-unit">%</span>
        </div>
      </div>
    </div>

    <div class="ee__total" :class="{ 'ee__total--ok': total === 100, 'ee__total--error': total !== 100 }">
      <span class="ee__total-label">{{ t('envelopes.editor.total') }}</span>
      <span class="ee__total-value">{{ total }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ENVELOPE_COLORS } from '~/stores/useEnvelopeStore'

const { t } = useI18n()

const props = defineProps<{
  modelValue: { needs: number; wants: number; savings: number }
  income:     number | null
}>()

const emit = defineEmits<{ 'update:modelValue': [{ needs: number; wants: number; savings: number }] }>()

const { fmt } = useCurrency()

const mode = ref<'sliders' | 'free'>('sliders')

const current = ref({ ...props.modelValue })

watch(() => props.modelValue, (val) => {
  if (
    val.needs   === current.value.needs   &&
    val.wants   === current.value.wants   &&
    val.savings === current.value.savings
  ) return
  current.value = { ...val }
}, { deep: true })

watch(current, (val) => {
  emit('update:modelValue', { ...val })
}, { deep: true })

const total = computed(() => current.value.needs + current.value.wants + current.value.savings)

const envelopeItems = computed(() => [
  { key: 'needs'   as const, label: t('envelopes.needs'),   color: ENVELOPE_COLORS.needs   },
  { key: 'wants'   as const, label: t('envelopes.wants'),   color: ENVELOPE_COLORS.wants   },
  { key: 'savings' as const, label: t('envelopes.savings'), color: ENVELOPE_COLORS.savings },
])

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)))
}

// Sliders : épargne = variable d'ajustement pour needs/wants
// Pour épargne, c'est "envies" qui s'ajuste
function onSlider(key: 'needs' | 'wants' | 'savings', val: number) {
  if (key === 'needs') {
    const delta    = val - current.value.needs
    const absorbed = delta > 0 ? Math.min(delta, current.value.savings) : delta
    current.value.needs   += absorbed
    current.value.savings -= absorbed
  } else if (key === 'wants') {
    const delta    = val - current.value.wants
    const absorbed = delta > 0 ? Math.min(delta, current.value.savings) : delta
    current.value.wants   += absorbed
    current.value.savings -= absorbed
  } else {
    const delta    = val - current.value.savings
    const absorbed = delta > 0 ? Math.min(delta, current.value.wants) : delta
    current.value.savings += absorbed
    current.value.wants   -= absorbed
  }
}
</script>

<style scoped lang="scss">
.ee {
  display: flex;
  flex-direction: column;
  gap: 20px;

  &__mode-toggle {
    display: flex;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    padding: 3px;
    gap: 2px;
  }

  &__mode-btn {
    flex: 1;
    padding: 6px 12px;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-text-muted);
    border-radius: calc(var(--radius-sm) - 2px);
    transition: background $transition-fast, color $transition-fast;

    &--active {
      background: var(--color-bg-surface);
      color: var(--color-text-primary);
      font-weight: 600;
    }
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  &__row {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__row-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__row-name {
    font-size: 0.9rem;
    font-weight: 600;
  }

  &__row-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__row-pct {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text-primary);
    min-width: 36px;
    text-align: right;
  }

  &__row-amount {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  &__slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: var(--color-bg-elevated);
    outline: none;
    cursor: pointer;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      cursor: pointer;
      background: currentColor;
    }
  }

  &__free-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    padding: 0 14px;
    border: 1px solid var(--color-border);
  }

  &__free-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    padding: 12px 0;
    -moz-appearance: textfield;

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button { -webkit-appearance: none; }
  }

  &__free-unit {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-elevated);

    &--ok    { border: 1px solid #34d39940; }
    &--error { border: 1px solid var(--color-danger); }
  }

  &__total-label {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
  }

  &__total-value {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-danger);

    .ee__total--ok & { color: #34d399; }
  }
}
</style>
