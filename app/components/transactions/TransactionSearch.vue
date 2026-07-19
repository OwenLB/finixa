<template>
  <div class="tx-search">
    <Search :size="16" class="tx-search__icon" />
    <input
      :value="modelValue"
      class="tx-search__input"
      :placeholder="$t('filters.placeholder')"
      type="search"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next'

defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<style scoped lang="scss">
.tx-search {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-bg-elevated);
  border-radius: var(--radius-lg);
  padding: 11px 14px;

  &__icon {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  &__input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 14px;
    color: var(--color-text-primary);

    &::placeholder { color: var(--color-text-muted); }

    // Reset search input appearance
    &::-webkit-search-cancel-button { display: none; }
  }
}
</style>
