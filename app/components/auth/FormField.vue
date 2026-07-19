<template>
  <div class="aff">
    <label class="aff__label" :for="id">{{ label }}</label>
    <input
      :id="id"
      :value="modelValue"
      :type="type"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      class="aff__input"
      required
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  id:           string
  modelValue:   string
  label:        string
  type:         string
  autocomplete: string
  placeholder?: string
}>()

defineEmits<{ 'update:modelValue': [string] }>()
</script>

<style scoped lang="scss">
.aff {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &__label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__input {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 14px 16px;
    font-size: 1rem;
    color: var(--color-text-primary);
    outline: none;
    transition: border-color $transition-fast;

    &::placeholder { color: var(--color-text-muted); }
    &:focus { border-color: var(--color-accent); }
  }
}
</style>
