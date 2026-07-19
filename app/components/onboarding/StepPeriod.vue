<template>
  <OnboardingStepLayout
    :title="$t('onboarding.period.title')"
    :subtitle="$t('onboarding.period.subtitle')"
  >
    <UiDayOfMonthGrid v-model="day" :max="31" />

    <p v-if="day >= 29" class="period-warning">{{ $t('more.periodStartDayShortWarning') }}</p>

    <template #actions>
      <p v-if="error" class="period-error">{{ error }}</p>
      <AppButton :loading="loading" @click="$emit('commit', day)">
        {{ $t('onboarding.period.cta') }}
      </AppButton>
    </template>
  </OnboardingStepLayout>
</template>

<script setup lang="ts">
const props = defineProps<{ startDay: number; loading: boolean; error: string }>()
defineEmits<{ commit: [day: number] }>()

const day = ref(props.startDay)
</script>

<style scoped lang="scss">
.period-warning {
  font-size: 12px;
  color: var(--color-warning);
  line-height: 1.5;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--color-warning) 10%, transparent);
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--color-warning) 25%, transparent);
}

.period-error {
  font-size: 0.85rem;
  color: var(--color-danger);
  text-align: center;
}
</style>
