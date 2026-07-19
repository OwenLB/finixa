<template>
  <div class="skeleton" :style="{ width, height, borderRadius }" />
</template>

<script setup lang="ts">
defineProps<{
  width?:        string
  height?:       string
  borderRadius?: string
}>()
</script>

<style scoped lang="scss">
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-elevated) 25%,
    var(--color-bg-card)     50%,
    var(--color-bg-elevated) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
