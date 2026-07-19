<template>
  <div ref="el" class="ptr">
    <div
      class="ptr__indicator"
      :class="{ 'ptr__indicator--animate': animate }"
      :style="{ height: `${pullY}px` }"
    >
      <div class="ptr__icon">
        <Transition name="ptr-swap" mode="out-in">
          <Loader2 v-if="refreshing" key="spinner" :size="20" class="ptr__spinner" />
          <ArrowDown
            v-else
            key="arrow"
            :size="20"
            class="ptr__arrow"
            :style="{
              opacity: progress,
              transform: `rotate(${progress * 180}deg)`,
            }"
          />
        </Transition>
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { Loader2, ArrowDown } from 'lucide-vue-next'
import { usePullToRefresh, PTR_THRESHOLD } from '~/composables/usePullToRefresh'

const props = defineProps<{
  refresh: () => Promise<void>
}>()

const el = ref<HTMLElement | null>(null)
const { pullY, refreshing, animate } = usePullToRefresh(el, props.refresh)

const progress = computed(() => Math.min(pullY.value / PTR_THRESHOLD, 1))
</script>

<style scoped lang="scss">
.ptr {
  &__indicator {
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    justify-content: center;

    &--animate {
      transition: height 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
  }

  &__icon {
    padding-bottom: 10px;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__arrow {
    transition: transform 0.05s linear, opacity 0.1s;
    display: block;
  }

  &__spinner {
    animation: ptr-spin 0.7s linear infinite;
  }
}

.ptr-swap-enter-active,
.ptr-swap-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.ptr-swap-enter-from {
  opacity: 0;
  transform: scale(0.6);
}
.ptr-swap-leave-to {
  opacity: 0;
  transform: scale(0.6);
}

@keyframes ptr-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
