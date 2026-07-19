<template>
  <AppButton v-if="!confirming" variant="danger" @click="confirming = true">
    <slot name="icon"><Trash2 :size="15" /></slot>
    <slot>Supprimer</slot>
  </AppButton>

  <div v-else class="acd">
    <span class="acd__text">{{ message ?? 'Supprimer définitivement ?' }}</span>
    <div class="acd__actions">
      <button class="acd__cancel" @click="confirming = false">Annuler</button>
      <button class="acd__ok" @click="onConfirm">Supprimer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'

defineProps<{ message?: string }>()
const emit = defineEmits<{ confirm: [] }>()

const confirming = ref(false)

function onConfirm() {
  emit('confirm')
  confirming.value = false
}

defineExpose({ reset: () => { confirming.value = false } })
</script>

<style scoped lang="scss">
.acd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: color-mix(in srgb, var(--color-danger) 7%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
  border-radius: var(--radius-md);

  &__text {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-danger);
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__cancel {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-muted);
    padding: 6px 12px;
    border-radius: var(--radius-md);
    background: var(--color-bg-elevated);
  }

  &__ok {
    font-size: 13px;
    font-weight: 600;
    color: white;
    padding: 6px 12px;
    border-radius: var(--radius-md);
    background: var(--color-danger);
  }
}
</style>
