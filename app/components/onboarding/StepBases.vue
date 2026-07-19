<template>
  <OnboardingStepLayout
    :title="userName ? $t('onboarding.welcome.titleName', { name: userName }) : $t('onboarding.welcome.title')"
    :subtitle="$t('onboarding.bases.subtitle')"
  >
    <!-- Devise -->
    <div class="field">
      <span class="field__label">{{ $t('onboarding.bases.currencyLabel') }}</span>
      <button class="currency" @click="currencyDrawer = true">
        <span class="currency__flag">{{ flag }}</span>
        <span class="currency__code">{{ currencyStore.currency }}</span>
        <ChevronDown :size="16" class="currency__chevron" />
      </button>
    </div>

    <!-- Revenu -->
    <div class="field">
      <span class="field__label">{{ $t('onboarding.income.label') }}</span>
      <div class="income">
        <input
          :value="modelValue ?? ''"
          class="income__input"
          type="number"
          min="0"
          :placeholder="$t('onboarding.income.placeholder')"
          inputmode="decimal"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).valueAsNumber || null)"
        />
        <span class="income__currency">{{ symbol }}</span>
      </div>
    </div>

    <template #actions>
      <AppButton @click="$emit('next')">{{ $t('onboarding.income.next') }}</AppButton>
      <AppButton variant="ghost" class="skip" @click="$emit('skip')">
        {{ $t('onboarding.income.skip') }}
      </AppButton>
    </template>

    <AppDrawer v-model="currencyDrawer" :title="$t('more.currency')">
      <MorePickerList
        :items="currencyItems"
        :model-value="currencyStore.currency"
        @update:model-value="selectCurrency"
      />
    </AppDrawer>
  </OnboardingStepLayout>
</template>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { CURRENCY_FLAGS, CURRENCY_SYMBOLS, CURRENCY_CODES } from '~/data/currencies'

defineProps<{ modelValue: number | null; userName: string }>()
defineEmits<{ 'update:modelValue': [v: number | null]; next: []; skip: [] }>()

const { t } = useI18n()
const currencyStore = useCurrencyStore()
const prefsStore    = usePreferencesStore()

const currencyDrawer = ref(false)

const flag   = computed(() => CURRENCY_FLAGS[currencyStore.currency] ?? '')
const symbol = computed(() => CURRENCY_SYMBOLS[currencyStore.currency] ?? currencyStore.currency)

const currencyItems = computed(() =>
  CURRENCY_CODES.map(code => ({
    code,
    flag:     CURRENCY_FLAGS[code],
    label:    t(`currencies.${code}`),
    sublabel: code,
  })),
)

function selectCurrency(code: string) {
  prefsStore.setCurrency(code)
  currencyDrawer.value = false
}
</script>

<style scoped lang="scss">
.field {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__label { @include label-caps; }
}

.currency {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: var(--color-bg-elevated);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  padding: 13px 14px;
  transition: border-color $transition-fast;
  &:active { border-color: var(--color-accent); }

  &__flag { font-size: 18px; }
  &__code {
    flex: 1;
    text-align: left;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  &__chevron { color: var(--color-text-muted); }
}

.income {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  &__input {
    width: 100%;
    font-size: 3rem;
    font-weight: 700;
    text-align: center;
    background: transparent;
    border: none;
    border-bottom: 2px solid var(--color-border);
    color: var(--color-text-primary);
    outline: none;
    padding: 12px 56px 12px 16px;
    transition: border-color $transition-fast;

    &:focus { border-bottom-color: var(--color-accent); }
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button { -webkit-appearance: none; }
    &::placeholder { color: var(--color-text-muted); }
  }

  &__currency {
    position: absolute;
    right: 12px;
    font-size: 1.6rem;
    color: var(--color-text-muted);
  }
}

.skip { align-self: center; }
</style>
