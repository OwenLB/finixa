<template>
  <div class="rlist">
    <!-- En-tête : titre + sous-titre + « Tout accepter » -->
    <div class="rlist__header">
      <div class="rlist__heading">
        <p class="rlist__title">{{ title }}</p>
        <p v-if="subtitle" class="rlist__subtitle" :class="{ 'rlist__subtitle--warn': subtitleWarn }">
          {{ subtitle }}
        </p>
      </div>
      <button
        v-if="showAcceptAll"
        class="rlist__accept-all"
        :disabled="acceptAllDisabled"
        @click="$emit('accept-all')"
      >
        {{ acceptAllLabel || $t('csvImport.recurring.acceptAll') }}
      </button>
    </div>

    <!-- Barre d'outils optionnelle (recherche / tri…) -->
    <slot name="toolbar" />

    <!-- Liste scrollable des cartes -->
    <div class="rlist__scroll"><slot /></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title:             string
  subtitle?:         string
  subtitleWarn?:     boolean
  showAcceptAll?:    boolean
  acceptAllDisabled?: boolean
  acceptAllLabel?:   string
}>(), { subtitle: '', subtitleWarn: false, showAcceptAll: false, acceptAllDisabled: false, acceptAllLabel: '' })

defineEmits<{ 'accept-all': [] }>()
</script>

<style scoped lang="scss">
.rlist {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  &__title {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__subtitle {
    font-size: 12px;
    color: var(--color-text-muted);
    margin-top: 2px;

    &--warn { color: #818cf8; }   // marqueur "à vérifier" — indigo
  }

  &__accept-all {
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-accent-fg);
    padding: 6px 12px;
    background: var(--color-accent);
    border-radius: var(--radius-md);
    transition: opacity $transition-fast;

    &:disabled { opacity: 0.4; }
    &:active:not(:disabled) { opacity: 0.8; }
  }

  &__scroll {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 340px;
    overflow-y: auto;
  }
}
</style>
