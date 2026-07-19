<template>
  <Transition name="banner-slide">
    <div v-if="isVisible" class="alert-banner" :style="styles">

      <div class="alert-banner__left">
        <div class="alert-banner__dot" />
        <!-- Mode multi-items -->
        <div v-if="items" class="alert-banner__items">
          <template v-for="(item, i) in items" :key="i">
            <span v-if="i > 0" class="alert-banner__sep">·</span>
            <div class="alert-banner__text">
              <span class="alert-banner__count">{{ item.count }}</span>
              <span class="alert-banner__label">{{ item.label }}</span>
            </div>
          </template>
        </div>
        <!-- Mode simple -->
        <div v-else class="alert-banner__text">
          <span class="alert-banner__count">{{ count }}</span>
          <span class="alert-banner__label">{{ label }}</span>
        </div>
      </div>

      <button class="alert-banner__cta" @click="$emit('action')">
        {{ cta }}
        <ArrowRight :size="14" />
      </button>

    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'

export interface AlertItem {
  count: number
  label: string
}

const props = defineProps<{
  count?: number
  label?: string
  cta: string
  color?: string
  items?: AlertItem[]
}>()

defineEmits<{ action: [] }>()

const isVisible = computed(() =>
  props.items ? props.items.some(i => i.count > 0) : (props.count ?? 0) > 0
)

function hexToRgb(hex: string): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

const styles = computed(() => ({
  '--ab-rgb': hexToRgb(props.color ?? '#f59e0b'),
}))
</script>

<style scoped lang="scss">
.alert-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(var(--ab-rgb), 0.08);
  border: 1.5px solid rgba(var(--ab-rgb), 0.25);
  border-radius: var(--radius-lg);
  margin-bottom: 4px;

  &__left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgb(var(--ab-rgb));
    flex-shrink: 0;
    animation: pulse-dot 2s ease-in-out infinite;
  }

  &__items {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__sep {
    color: var(--color-text-muted);
    font-size: 13px;
    flex-shrink: 0;
  }

  &__text {
    display: flex;
    align-items: baseline;
    gap: 5px;
    min-width: 0;
  }

  &__count {
    font-size: 16px;
    font-weight: 800;
    color: rgb(var(--ab-rgb));
    font-family: var(--font-title);
    flex-shrink: 0;
  }

  &__label {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__cta {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 8px 14px;
    border-radius: 99px;
    background: rgb(var(--ab-rgb));
    color: #000;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
    transition: opacity $transition-fast, transform $transition-fast;

    &:active {
      opacity: 0.8;
      transform: scale(0.96);
    }
  }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.7); }
}

.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: opacity 300ms ease, transform 300ms ease, max-height 300ms ease;
  max-height: 80px;
  overflow: hidden;
}
.banner-slide-enter-from,
.banner-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
}
</style>
