<template>
  <div class="filter-section">
    <span class="filter-section__title">{{ title }}</span>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<style scoped lang="scss">
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }
}
</style>
