<template>
  <component
    :is="clickable ? 'button' : 'div'"
    class="settings-row"
    :class="{ 'settings-row--clickable': clickable }"
    @click="clickable ? $emit('click') : undefined"
  >
    <div class="settings-row__icon" :style="{ background: iconBg }">
      <slot name="icon" />
    </div>
    <span class="settings-row__label">{{ label }}</span>
    <slot />
    <ChevronRight v-if="chevron" :size="16" class="settings-row__chevron" />
  </component>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'

defineProps<{
  label:    string
  iconBg:   string
  clickable?: boolean
  chevron?:  boolean
}>()

defineEmits<{ click: [] }>()
</script>

<style scoped lang="scss">
.settings-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  width: 100%;

  & + & { border-top: 1px solid var(--color-border-subtle); }

  &--clickable {
    transition: background $transition-fast;
    &:active { background: var(--color-bg-elevated); }

    @media (min-width: $breakpoint-lg) {
      &:hover { background: var(--color-bg-elevated); }
    }
  }

  &__icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__label {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
    text-align: left;
  }

  &__chevron { color: var(--color-text-muted); }
}
</style>
