<template>
  <OnboardingStepLayout
    :title="$t('onboarding.recurring.title')"
    :subtitle="$t('onboarding.recurring.subtitle')"
  >
    <div class="rlist">
      <div v-for="(item, i) in items" :key="i" class="rrow">
        <!-- Ligne principale : icône + nom + supprimer -->
        <div class="rrow__main">
          <div class="rrow__icon">
            <component :is="itemIcon(item)" :size="16" />
          </div>
          <input
            v-model="item.label"
            class="rrow__label"
            type="text"
            :placeholder="item.placeholder ?? $t('onboarding.recurring.namePlaceholder')"
          />
          <button class="rrow__remove" :aria-label="$t('a11y.remove')" @click="removeItem(i)">
            <X :size="16" />
          </button>
        </div>

        <!-- Ligne secondaire : montant + type + jour -->
        <div class="rrow__sub">
          <div class="rrow__amount-field">
            <input
              v-model.number="item.amount"
              class="rrow__amount-input"
              type="number"
              min="0"
              inputmode="decimal"
              :placeholder="$t('onboarding.recurring.amountPlaceholder')"
            />
            <span class="rrow__unit">€</span>
          </div>

          <div v-if="item.customType" class="rrow__type-tabs">
            <button
              v-for="opt in typeOptions"
              :key="opt.value"
              class="rrow__type-tab"
              :class="{ 'rrow__type-tab--active': item.type === opt.value }"
              @click="item.type = opt.value"
            >{{ opt.label }}</button>
          </div>

          <button class="rrow__day" @click="openDayPicker(i)">
            <CalendarDays :size="12" />
            {{ $t('onboarding.recurring.dayPrefix', { day: item.day }) }}
          </button>
        </div>
      </div>
    </div>

    <button class="radd" @click="addExtra">
      <Plus :size="14" />
      {{ $t('onboarding.recurring.addLine') }}
    </button>

    <template #actions>
      <p v-if="error" class="rerror">{{ error }}</p>
      <AppButton :loading="loading" @click="submit">{{ $t('onboarding.recurring.submit') }}</AppButton>
    </template>

    <!-- Bottom sheet sélection du jour -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="dayPickerIndex !== null" class="sheet-overlay" @click.self="closeDayPicker">
          <div class="sheet">
            <div class="sheet__handle-bar" @click="closeDayPicker">
              <div class="sheet__handle" />
            </div>
            <div class="sheet__header">
              <span class="sheet__title">{{ $t('onboarding.recurring.dayPickerTitle') }}</span>
            </div>
            <UiDayOfMonthGrid
              :model-value="items[dayPickerIndex!]?.day ?? 1"
              :max="28"
              @update:model-value="selectDay"
            />
            <p class="sheet__note">{{ $t('onboarding.recurring.dayPickerNote') }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </OnboardingStepLayout>
</template>

<script setup lang="ts">
import { X, Plus, CalendarDays, ArrowDownLeft, ArrowUpRight, PiggyBank } from 'lucide-vue-next'
import type { Component } from 'vue'
import type { TransactionType } from '~/types'
import type { RecurringDraft } from '~/utils/onboarding'

const { t } = useI18n()

/** Ligne pré-remplie depuis les catégories créées (porte le lien par ID). */
export interface RecurringPreset {
  label:         string
  amount:        number
  type:          TransactionType
  day:           number
  subcategoryId: string
}

interface ItemDraft {
  label:         string
  amount:        number
  type:          TransactionType
  day:           number
  subcategoryId: string
  customType:    boolean
  placeholder?:  string
}

const props = defineProps<{
  presets:  RecurringPreset[]
  loading?: boolean
  error?:   string
}>()

const emit = defineEmits<{ commit: [items: RecurringDraft[]] }>()

const typeOptions = computed<{ label: string; value: TransactionType }[]>(() => [
  { label: t('onboarding.recurring.typeExpense'), value: 'depense' },
  { label: t('onboarding.recurring.typeIncome'),  value: 'revenu'  },
  { label: t('onboarding.recurring.typeSavings'), value: 'epargne' },
])

const items = ref<ItemDraft[]>(
  props.presets.map(p => ({ ...p, customType: false })),
)

function itemIcon(item: ItemDraft): Component {
  if (item.type === 'revenu')  return ArrowUpRight
  if (item.type === 'epargne') return PiggyBank
  return ArrowDownLeft
}

function addExtra() {
  items.value.push({
    label: '', amount: 0, type: 'depense', day: 1, subcategoryId: '',
    customType: true, placeholder: t('onboarding.recurring.extraPlaceholder'),
  })
}

function removeItem(i: number) {
  items.value.splice(i, 1)
}

// --- Day picker ---
const dayPickerIndex = ref<number | null>(null)

function openDayPicker(i: number) { dayPickerIndex.value = i }
function closeDayPicker()         { dayPickerIndex.value = null }

function selectDay(d: number) {
  const idx = dayPickerIndex.value
  if (idx !== null && items.value[idx]) items.value[idx].day = d
  closeDayPicker()
}

function submit() {
  const result: RecurringDraft[] = items.value
    .filter(item => item.amount > 0 && item.label.trim())
    .map(({ label, amount, type, day, subcategoryId }) => ({ label: label.trim(), amount, type, day, subcategoryId }))
  emit('commit', result)
}
</script>

<style scoped lang="scss">
.rlist {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.radd {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-weight: 500;
  padding: 2px 0;
  transition: color $transition-fast;
  &:active { color: var(--color-text-secondary); }
}

.rerror {
  font-size: 0.875rem;
  color: var(--color-danger);
  text-align: center;
}

.rrow {
  display: flex;
  flex-direction: column;
  padding: 12px 14px 10px;

  & + & { border-top: 1px solid var(--color-border-subtle); }

  &__main {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  &__icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--color-bg-elevated);
    color: var(--color-text-secondary);
  }

  &__label {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    background: transparent;
    border: none;
    outline: none;
    &::placeholder { color: var(--color-text-muted); font-weight: 400; }
  }

  &__remove {
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    padding: 4px;
    margin: -4px;
    flex-shrink: 0;
    transition: color $transition-fast;
    border-radius: var(--radius-sm);
    &:active { color: var(--color-danger); }
  }

  &__sub {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-left: 42px;
    flex-wrap: wrap;
  }

  &__amount-field {
    display: flex;
    align-items: center;
    gap: 3px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: 5px 8px;
  }

  &__amount-input {
    width: 70px;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    background: transparent;
    border: none;
    outline: none;
    text-align: right;
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button { -webkit-appearance: none; }
  }

  &__unit {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  &__type-tabs {
    display: flex;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    overflow: hidden;
    gap: 1px;
  }

  &__type-tab {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-muted);
    background: transparent;
    padding: 5px 8px;
    border-radius: var(--radius-md);
    transition: background $transition-fast, color $transition-fast;

    &--active {
      background: var(--color-accent);
      color: var(--color-accent-fg);
      font-weight: 600;
    }
  }

  &__day {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: 5px 8px;
    transition: color $transition-fast;
    &:active { color: var(--color-text-primary); }
  }
}

/* ── Bottom sheet ─────────────────────────────────────────── */

.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 500;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  background: var(--color-bg-card);
  border-radius: 20px 20px 0 0;
  padding: 0 20px calc(28px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__handle-bar {
    display: flex;
    justify-content: center;
    padding: 12px 0 4px;
    cursor: pointer;
  }

  &__handle {
    width: 36px;
    height: 4px;
    border-radius: 99px;
    background: var(--color-border);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__note {
    font-size: 12px;
    color: var(--color-text-muted);
    text-align: center;
    padding-bottom: 4px;
  }
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease;
  .sheet { transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1); }
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
  .sheet { transform: translateY(100%); }
}
</style>
