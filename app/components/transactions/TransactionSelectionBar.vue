<template>
  <Transition name="slide-up">
    <div v-if="selectionStore.active" class="selection-bar">
      <SelectionBarAction
        :label="allSelected ? $t('selection.deselectAll') : $t('selection.selectAll')"
        :disabled="actions.loading.value || allIds.length === 0"
        @click="onToggleAll"
      >
        <CheckSquare2 v-if="allSelected" :size="20" />
        <Square v-else :size="20" />
      </SelectionBarAction>

      <SelectionBarAction
        :label="$t('selection.pointer')"
        :disabled="actions.loading.value"
        @click="actions.pointer()"
      >
        <CheckCircle2 :size="20" />
      </SelectionBarAction>

      <SelectionBarAction
        :label="$t('selection.categorize')"
        :disabled="actions.loading.value"
        @click="actions.openCategorize()"
      >
        <Tag :size="20" />
      </SelectionBarAction>

      <SelectionBarAction
        :label="$t('selection.delete')"
        :disabled="actions.loading.value"
        danger
        @click="actions.remove()"
      >
        <Trash2 :size="20" />
      </SelectionBarAction>
    </div>
  </Transition>

</template>

<script setup lang="ts">
import { CheckCircle2, CheckSquare2, Square, Tag, Trash2 } from 'lucide-vue-next'
import SelectionBarAction                 from '~/components/transactions/SelectionBarAction.vue'
import { useSelectionStore }              from '~/stores/useSelectionStore'
import { useSelectionActions }            from '~/composables/useSelectionActions'

const props = defineProps<{ allIds: string[] }>()

const selectionStore = useSelectionStore()
const actions        = useSelectionActions()

const allSelected = computed(() =>
  props.allIds.length > 0 && props.allIds.every(id => selectionStore.isSelected(id))
)

function onToggleAll() {
  if (allSelected.value) selectionStore.clear()
  else                   selectionStore.selectAll(props.allIds)
}
</script>

<style scoped lang="scss">
.selection-bar {
  position: fixed;
  bottom: calc(#{$tab-bar-height} + env(safe-area-inset-bottom));
  left: 0;
  right: 0;

  @media (min-width: $breakpoint-lg) {
    bottom: 0;
    left: $sidebar-width; // ne pas couvrir la sidebar
  }
  z-index: 20;
  background: var(--color-bg-surface);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 8px $page-padding-x;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform $transition-base;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
