<template>
  <button
    class="selection-action"
    :class="{
      'selection-action--danger':   danger,
      'selection-action--disabled': disabled,
    }"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot />
    <span>{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{ label: string; danger?: boolean; disabled?: boolean }>()
defineEmits<{ click: [] }>()
</script>

<style scoped lang="scss">
.selection-action {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 8px 4px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 10px;
  font-weight: 500;
  transition: opacity $transition-fast;

  &:active    { opacity: 0.6; }
  &--danger   { color: var(--color-danger); }
  &--disabled { opacity: 0.35; pointer-events: none; }
}
</style>
