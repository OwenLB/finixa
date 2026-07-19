<template>
  <div class="cat-actions">

    <!-- Passer -->
    <button
      class="cat-actions__btn cat-actions__btn--skip"
      :disabled="loading"
      @click="$emit('skip')"
    >
      <SkipForward :size="17" />
      <span>{{ $t('categorization.actions.skip') }}</span>
    </button>

    <!-- Valider (avec suggestion) ou Choisir (sans suggestion) -->
    <button
      v-if="hasSuggestion"
      class="cat-actions__btn cat-actions__btn--validate"
      :disabled="loading"
      @click="$emit('validate')"
    >
      <CheckCircle2 :size="17" />
      <span>{{ $t('categorization.actions.validate') }}</span>
    </button>

    <button
      v-else
      class="cat-actions__btn cat-actions__btn--pick"
      @click="$emit('pick')"
    >
      <Tag :size="17" />
      <span>{{ $t('categorization.actions.pick') }}</span>
    </button>

  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, SkipForward, Tag } from 'lucide-vue-next'

defineProps<{
  hasSuggestion: boolean
  loading?:      boolean
}>()

defineEmits<{
  validate: []
  skip:     []
  pick:     []
}>()
</script>

<style scoped lang="scss">
.cat-actions {
  display: flex;
  gap: 12px;

  &__btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 16px 12px;
    border-radius: var(--radius-lg);
    font-size: 15px;
    font-weight: 600;
    transition: opacity $transition-fast, transform $transition-fast;

    &:active {
      opacity: 0.8;
      transform: scale(0.97);
    }

    &:disabled {
      opacity: 0.4;
      pointer-events: none;
    }

    // Passer — ghost / subtil
    &--skip {
      background: var(--color-bg-elevated);
      color: var(--color-text-secondary);
    }

    // Valider — accent principal
    &--validate {
      background: var(--color-accent);
      color: var(--color-accent-fg);
    }

    // Choisir une catégorie — accent secondaire (moins fort que valider)
    &--pick {
      background: var(--color-accent);
      color: var(--color-accent-fg);
    }
  }
}
</style>
