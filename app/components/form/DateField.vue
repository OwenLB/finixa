<template>
  <AppFormField :label="label">
    <label class="fdf">
      <span class="fdf__text" :class="{ 'fdf__text--muted': muted }">{{ formattedValue }}</span>
      <CalendarDays :size="18" class="fdf__icon" />
      <input
        :value="modelValue"
        type="date"
        class="fdf__native"
        @change="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </label>
  </AppFormField>
</template>

<script setup lang="ts">
import { CalendarDays } from 'lucide-vue-next'

defineProps<{
  label:          string
  modelValue:     string
  formattedValue: string
  muted?:         boolean
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<style scoped lang="scss">
.fdf {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-bg-elevated);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  padding: 13px 14px;
  cursor: pointer;

  &:focus-within { border-color: var(--color-accent); }

  &__text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    color: var(--color-text-primary);
    text-transform: capitalize;

    &--muted { color: var(--color-text-muted); }
  }

  &__icon { color: var(--color-text-muted); }

  &__native {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%;
    cursor: pointer;
  }
}
</style>
