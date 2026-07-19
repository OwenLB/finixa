<template>
  <header class="page-header">
    <div class="page-header__row">
      <div class="page-header__left">
        <p v-if="showDate" class="page-header__date">{{ currentDate }}</p>
        <h1 class="page-header__title">{{ title }}</h1>
      </div>

      <div v-if="$slots.actions" class="page-header__actions">
        <slot name="actions" />
      </div>
    </div>

    <slot />
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  showDate?: boolean
}>()

const currentDate = computed(() =>
  new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  }).toUpperCase()
)
</script>

<style scoped lang="scss">
.page-header {
  padding: calc(env(safe-area-inset-top) + 4px) $page-padding-x 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (min-width: $breakpoint-lg) {
    padding: 20px 24px 16px;
  }

  &__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  &__left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__date {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }

  &__title {
    font-family: var(--font-title);
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1.1;

    @media (min-width: $breakpoint-lg) {
      font-size: 1.5rem;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 4px;
  }
}
</style>
