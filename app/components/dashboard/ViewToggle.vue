<template>
  <div class="view-toggle">
    <button
      v-for="option in options"
      :key="option.value"
      class="view-toggle__btn"
      :class="{ 'view-toggle__btn--active': modelValue === option.value }"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
export type ViewMode = 'depense' | 'restant'

defineProps<{ modelValue: ViewMode }>()
defineEmits<{ 'update:modelValue': [value: ViewMode] }>()

const { t } = useI18n()

const options = computed<{ value: ViewMode; label: string }[]>(() => [
  { value: 'depense', label: t('view.spent')     },
  { value: 'restant', label: t('view.remaining') },
])
</script>

<style scoped lang="scss">
.view-toggle {
  display: flex;
  background: var(--color-bg-elevated);
  border-radius: 99px;
  padding: 3px;
  gap: 2px;

  &__btn {
    flex: 1;
    padding: 8px 16px;
    border-radius: 99px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-muted);
    transition: background $transition-fast, color $transition-fast;

    &--active {
      background: var(--color-accent);
      color: var(--color-accent-fg);
    }
  }
}
</style>
