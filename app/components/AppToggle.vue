<template>
  <label class="app-toggle">
    <input
      class="app-toggle__input"
      type="checkbox"
      :checked="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="app-toggle__track" :class="{ 'app-toggle__track--on': modelValue }">
      <span class="app-toggle__thumb" :class="{ 'app-toggle__thumb--on': modelValue }" />
    </span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<style scoped lang="scss">
.app-toggle {
  cursor: pointer;

  // Visually-hidden plutôt que display:none : l'input reste focusable au clavier
  &__input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    margin: 0;
  }

  &__track {
    display: block;
    width: 46px;
    height: 26px;
    border-radius: 99px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    position: relative;
    transition: background $transition-fast, border-color $transition-fast;

    &--on {
      background: var(--color-accent);
      border-color: var(--color-accent);
    }
  }

  // Anneau de focus visible au clavier (focus-visible sur l'input adjacent)
  &__input:focus-visible + &__track {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  &__thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--color-text-muted);
    transition: transform $transition-fast, background $transition-fast;

    &--on {
      transform: translateX(20px);
      background: var(--color-accent-fg);
    }
  }
}
</style>
