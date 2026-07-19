<template>
  <button
    class="app-btn"
    :class="[`app-btn--${variant}`, { 'app-btn--disabled': disabled || loading }]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    :style="variant === 'primary' && color ? { background: color } : {}"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?:  'primary' | 'danger' | 'ghost' | 'icon'
  color?:    string
  disabled?: boolean
  /** Désactive le bouton pendant un submit en cours (anti double-tap) */
  loading?:  boolean
}>(), { variant: 'primary' })
</script>

<style scoped lang="scss">
.app-btn {
  transition: opacity $transition-fast;
  &:active     { opacity: 0.8; }
  &--disabled  { opacity: 0.4; pointer-events: none; }

  // Pleine largeur — fond coloré, radius léger
  &--primary {
    @include btn-action;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  // Solid rouge pastel — supprimer
  &--danger {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    font-size: 14px;
    font-weight: 500;
    border-radius: var(--radius-md);
    transition: opacity $transition-fast;

    color: #b91c1c;
    background: #fee2e2;
    border: 1px solid #fca5a5;

    [data-theme="dark"] & {
      color: #fca5a5;
      background: #3f1212;
      border-color: #7f1d1d;
    }
  }

  // Fond subtil — actions secondaires
  &--ghost {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-muted);
    padding: 6px 12px;
    border-radius: var(--radius-md);
    background: var(--color-bg-elevated);
  }

  // Cercle — bouton icône (back, close…)
  &--icon {
    @include btn-icon;
    background: var(--color-bg-elevated);
    color: var(--color-text-secondary);
  }
}
</style>
