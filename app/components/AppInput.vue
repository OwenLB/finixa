<template>
  <div class="app-input-wrap">
    <input
      ref="inputEl"
      class="app-input"
      :class="{ 'app-input--error': !!error }"
      v-bind="$attrs"
      :value="modelValue"
      :disabled="disabled"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="suffix" class="app-input__suffix">{{ suffix }}</span>
  </div>
  <p v-if="error" class="app-input__error-msg">{{ error }}</p>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

defineProps<{
  modelValue?: string | number
  suffix?:     string
  error?:      string
  disabled?:   boolean
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()

const inputEl = ref<HTMLInputElement>()
defineExpose({ focus: () => inputEl.value?.focus() })
</script>

<style scoped lang="scss">
.app-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.app-input {
  @include input-field;

  &--error { border-color: var(--color-danger) !important; }

  // Cacher les spinners sur les inputs number
  &[type='number'] {
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button { appearance: none; }
    padding-right: 36px;
  }

  &__suffix {
    position: absolute;
    right: 14px;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-muted);
    pointer-events: none;
  }

  &__error-msg {
    font-size: 12px;
    color: var(--color-danger);
    margin-top: -4px;
  }
}
</style>
