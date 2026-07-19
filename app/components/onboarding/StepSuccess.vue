<template>
  <OnboardingStepLayout center>
    <div class="success__icon">
      <PartyPopper :size="32" />
    </div>
    <h2 class="success__title">{{ $t('onboarding.success.title') }}</h2>
    <p class="success__sub">
      <template v-if="catCount > 0">
        {{ $t('onboarding.success.categories', { count: catCount }, catCount) }}
      </template>
      <template v-if="catCount > 0 && recurringCount > 0"> · </template>
      <template v-if="recurringCount > 0">
        {{ $t('onboarding.success.recurring', { count: recurringCount }, recurringCount) }}
      </template>
      <template v-if="catCount === 0 && recurringCount === 0">{{ $t('onboarding.success.empty') }}</template>
    </p>

    <template #actions>
      <AppButton @click="$emit('import')">
        <Sparkles :size="17" />
        {{ $t('onboarding.success.importCta') }}
      </AppButton>
      <AppButton variant="ghost" @click="$emit('add')">{{ $t('onboarding.success.addExpense') }}</AppButton>
      <AppButton variant="ghost" class="success__dashboard" @click="$emit('dashboard')">
        {{ $t('onboarding.success.dashboard') }}
      </AppButton>
    </template>
  </OnboardingStepLayout>
</template>

<script setup lang="ts">
import { PartyPopper, Sparkles } from 'lucide-vue-next'

defineProps<{ catCount: number; recurringCount: number }>()
defineEmits<{ add: []; dashboard: []; import: [] }>()
</script>

<style scoped lang="scss">
.success {
  &__icon {
    width: 72px;
    height: 72px;
    border-radius: 20px;
    background: var(--color-bg-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-primary);
    margin-bottom: 8px;
  }

  &__title {
    font-family: var(--font-title);
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: -0.02em;
  }

  &__sub {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }

  &__dashboard { align-self: center; }
}
</style>
