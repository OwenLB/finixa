<template>
  <div class="profile-card">
    <div class="profile-card__avatar">
      <span>{{ initials }}</span>
    </div>
    <div class="profile-card__info">
      <span class="profile-card__name">{{ name }}</span>
      <span class="profile-card__email">{{ email }}</span>
    </div>
    <button class="profile-card__edit" :aria-label="$t('a11y.edit')" @click="$emit('edit')">
      <Pencil :size="15" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Pencil } from 'lucide-vue-next'

const props = defineProps<{ name: string; email: string }>()
defineEmits<{ edit: [] }>()

const initials = computed(() =>
  props.name.split(' ').map(n => n[0]).join('').toUpperCase()
)
</script>

<style scoped lang="scss">
.profile-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--color-bg-card);
  border-radius: var(--radius-md);

  &__avatar {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
    color: var(--color-accent-fg);
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__name {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__email {
    font-size: 12px;
    color: var(--color-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__edit {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--color-bg-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    flex-shrink: 0;
    transition: color $transition-fast;

    &:hover { color: var(--color-text-primary); }
  }
}
</style>
