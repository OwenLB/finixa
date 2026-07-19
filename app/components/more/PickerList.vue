<template>
  <ul class="picker-list">
    <li
      v-for="item in items"
      :key="item.code"
      class="picker-list__item"
      :class="{ 'picker-list__item--active': item.code === modelValue }"
      @click="$emit('update:modelValue', item.code)"
    >
      <span v-if="item.flag" class="picker-list__flag">{{ item.flag }}</span>
      <span class="picker-list__label">{{ item.label }}</span>
      <span v-if="item.sublabel" class="picker-list__sublabel">{{ item.sublabel }}</span>
      <span class="picker-list__radio" :class="{ 'picker-list__radio--checked': item.code === modelValue }" />
    </li>
  </ul>
</template>

<script setup lang="ts">
export interface PickerItem {
  code:      string
  label:     string
  flag?:     string
  sublabel?: string
}

defineProps<{
  items:      PickerItem[]
  modelValue: string
}>()

defineEmits<{ 'update:modelValue': [code: string] }>()
</script>

<style scoped lang="scss">
.picker-list {
  list-style: none;
  display: flex;
  flex-direction: column;

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 0;
    cursor: pointer;

    & + & { border-top: 1px solid var(--color-border-subtle); }

    &--active .picker-list__label { color: var(--color-text-primary); font-weight: 600; }
  }

  &__flag  { font-size: 20px; flex-shrink: 0; }

  &__label {
    flex: 1;
    font-size: 15px;
    color: var(--color-text-secondary);
  }

  &__sublabel {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__radio {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    flex-shrink: 0;
    transition: border-color $transition-fast, background $transition-fast;

    &--checked {
      border-color: var(--color-accent);
      background: var(--color-accent);
      box-shadow: inset 0 0 0 4px var(--color-bg-elevated);
    }
  }
}
</style>
