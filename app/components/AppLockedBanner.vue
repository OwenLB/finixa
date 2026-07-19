<template>
  <div v-if="locked" class="locked-banner">
    <Lock :size="14" />
    <slot>Modification impossible — période passée</slot>
  </div>
</template>

<script setup lang="ts">
import { Lock } from 'lucide-vue-next'
defineProps<{ locked: boolean }>()
</script>

<style scoped lang="scss">
.locked-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  border-radius: var(--radius-md);
  background: var(--color-bg-elevated);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
}
</style>
