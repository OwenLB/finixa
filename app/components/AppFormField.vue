<template>
  <div class="app-form-field">
    <label v-if="label" class="app-form-field__label">{{ label }}</label>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ label?: string }>()
</script>

<style scoped lang="scss">
.app-form-field {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__label { @include label-caps; }
}
</style>
