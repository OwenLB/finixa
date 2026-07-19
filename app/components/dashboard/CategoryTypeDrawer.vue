<template>
  <AppDrawer v-model="open" :title="type ? $t(`types.${type}`) : ''">
    <UiBreakdownPanel :segments="breakdown.segments" :total="breakdown.total">
      <span class="breakdown-total">{{ fmt(breakdown.total) }}</span>
      <span class="breakdown-total-label">{{ $t('dashboard.total') }}</span>
    </UiBreakdownPanel>
  </AppDrawer>
</template>

<script setup lang="ts">
import type { TransactionType } from '~/types'
import type { TypeBreakdown } from '~/types/dashboard'

const props = defineProps<{
  modelValue: boolean
  type:       TransactionType | null
  breakdown:  TypeBreakdown
}>()

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const { fmt } = useCurrency()
</script>

<style scoped lang="scss">
.breakdown-total {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.breakdown-total-label {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}
</style>
