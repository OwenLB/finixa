<template>
  <AppDrawer v-model="open" :title="$t('edit.recurringScope.title')">
    <div class="scope-sheet">
      <button class="scope-sheet__option" @click="$emit('choose', 'occurrence')">
        <div class="scope-sheet__icon">
          <CalendarDays :size="20" />
        </div>
        <div class="scope-sheet__text">
          <span class="scope-sheet__label">{{ $t('edit.recurringScope.occurrence') }}</span>
          <span class="scope-sheet__sub">{{ $t('edit.recurringScope.occurrenceSub') }}</span>
        </div>
        <ChevronRight :size="16" class="scope-sheet__arrow" />
      </button>

      <button class="scope-sheet__option" @click="$emit('choose', 'future')">
        <div class="scope-sheet__icon">
          <RefreshCw :size="20" />
        </div>
        <div class="scope-sheet__text">
          <span class="scope-sheet__label">{{ $t('edit.recurringScope.future') }}</span>
          <span class="scope-sheet__sub">{{ $t('edit.recurringScope.futureSub') }}</span>
        </div>
        <ChevronRight :size="16" class="scope-sheet__arrow" />
      </button>
    </div>
  </AppDrawer>
</template>

<script setup lang="ts">
import { CalendarDays, RefreshCw, ChevronRight } from 'lucide-vue-next'

const open = defineModel<boolean>({ required: true })
defineEmits<{ choose: [scope: 'occurrence' | 'future'] }>()
</script>

<style scoped lang="scss">
.scope-sheet {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__option {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px;
    border-radius: var(--radius-md);
    background: var(--color-bg-elevated);
    text-align: left;
    width: 100%;
    transition: opacity $transition-fast;

    &:active { opacity: 0.7; }
  }

  &__icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  &__label {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__sub {
    font-size: 12px;
    color: var(--color-text-muted);
    line-height: 1.3;
  }

  &__arrow {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }
}
</style>
