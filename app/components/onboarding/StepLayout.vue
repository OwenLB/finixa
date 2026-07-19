<template>
  <div class="ostep" :class="{ 'ostep--center': center }">
    <div v-if="title || subtitle" class="ostep__head">
      <h2 class="ostep__title">{{ title }}</h2>
      <p v-if="subtitle" class="ostep__sub">{{ subtitle }}</p>
    </div>

    <div class="ostep__body">
      <slot />
    </div>

    <div v-if="$slots.actions" class="ostep__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?:    string
  subtitle?: string
  /** Centre verticalement le contenu (écrans d'accueil / de succès). */
  center?:   boolean
}>()
</script>

<style scoped lang="scss">
.ostep {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px $page-padding-x calc(32px + env(safe-area-inset-bottom));
  gap: 24px;
  overflow-y: auto;

  &--center {
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  &__head {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__title {
    font-family: var(--font-title);
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  &__sub {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  &--center &__body {
    align-items: center;
    gap: 16px;
  }

  &__actions {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &--center &__actions {
    margin-top: 8px;
    width: 100%;
    max-width: 320px;
  }
}
</style>
