<template>
  <div class="more-section">
    <p class="more-section__title">{{ title }}</p>
    <slot name="before" />
    <div class="more-section__card">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<style scoped lang="scss">
.more-section {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    padding: 0 4px;
  }

  &__card {
    background: var(--color-bg-card);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
}
</style>
