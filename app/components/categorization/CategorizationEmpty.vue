<template>
  <div class="cat-empty">

    <!-- Tout catégorisé -->
    <template v-if="allCategorized">
      <div class="cat-empty__icon cat-empty__icon--success">
        <CheckCircle2 :size="36" />
      </div>
      <p class="cat-empty__title">{{ $t('categorization.empty.doneTitle') }}</p>
      <p class="cat-empty__sub">{{ $t('categorization.empty.doneSub') }}</p>
      <button v-if="showRecurring" class="cat-empty__btn" @click="$emit('recurring')">
        {{ $t('categorization.empty.recurring') }}
      </button>
      <button class="cat-empty__btn" :class="{ 'cat-empty__btn--secondary': showRecurring }" @click="$emit('close')">
        {{ $t('categorization.empty.close') }}
      </button>
    </template>

    <!-- Tout skipé, mais des transactions restent -->
    <template v-else>
      <div class="cat-empty__icon cat-empty__icon--skipped">
        <SkipForward :size="36" />
      </div>
      <p class="cat-empty__title">{{ $t('categorization.empty.skippedTitle') }}</p>
      <p class="cat-empty__sub">
        {{ $t('categorization.empty.skippedSub', { count: skippedCount }) }}
      </p>
      <div class="cat-empty__actions">
        <button class="cat-empty__btn cat-empty__btn--secondary" @click="$emit('close')">
          {{ $t('categorization.empty.later') }}
        </button>
        <button class="cat-empty__btn" @click="$emit('reset')">
          {{ $t('categorization.empty.retry') }}
        </button>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, SkipForward } from 'lucide-vue-next'

defineProps<{
  allCategorized: boolean
  skippedCount:   number
  showRecurring?: boolean
}>()

defineEmits<{
  close:     []
  reset:     []
  recurring: []
}>()
</script>

<style scoped lang="scss">
.cat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  padding: 0 32px;

  &__icon {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;

    &--success {
      background: rgba(52, 211, 153, 0.15);
      color: var(--color-success);
    }

    &--skipped {
      background: var(--color-bg-elevated);
      color: var(--color-text-muted);
    }
  }

  &__title {
    font-size: 20px;
    font-weight: 700;
    font-family: var(--font-title);
    color: var(--color-text-primary);
  }

  &__sub {
    font-size: 14px;
    color: var(--color-text-muted);
    line-height: 1.5;
    max-width: 260px;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    margin-top: 8px;
  }

  &__btn {
    @include btn-action;
    margin-top: 8px;

    &--secondary {
      background: var(--color-bg-elevated);
      color: var(--color-text-secondary);
      margin-top: 0;
    }
  }
}
</style>
