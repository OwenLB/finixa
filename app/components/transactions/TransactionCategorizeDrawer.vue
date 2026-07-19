<template>
  <AppDrawer v-model="open" :title="$t('selection.categorize')">

    <p class="cdr__hint">
      {{ $t('selection.categorizeHint', { count: selectionStore.count }) }}
    </p>

    <FormCategorySelector
      v-model:type="type"
      v-model:category="category"
      v-model:category-id="categoryId"
      v-model:subcategory="subcategory"
      v-model:subcategory-id="subcategoryId"
    />

    <button
      class="cdr__apply"
      :disabled="!category"
      @click="apply"
    >
      {{ $t('selection.categorizeApply') }}
    </button>

  </AppDrawer>
</template>

<script setup lang="ts">
import type { TransactionType } from '~/types'
import { useSelectionStore }   from '~/stores/useSelectionStore'

const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{
  apply: [category: string, categorized: boolean, type: TransactionType]
}>()

const selectionStore = useSelectionStore()

const type          = ref<TransactionType>('depense')
const category      = ref('')
const categoryId    = ref('')
const subcategory   = ref('')
const subcategoryId = ref('')

// Remet à zéro quand le drawer s'ouvre
watch(open, (v) => {
  if (v) {
    type.value          = 'depense'
    category.value      = ''
    categoryId.value    = ''
    subcategory.value   = ''
    subcategoryId.value = ''
  }
})

function apply() {
  if (!category.value) return
  const effectiveCategory = subcategoryId.value || categoryId.value
  if (!effectiveCategory) return
  emit('apply', effectiveCategory, true, type.value)
}
</script>

<style scoped lang="scss">
.cdr {
  &__hint {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  &__apply {
    @include btn-action;

    &:disabled {
      opacity: 0.35;
      pointer-events: none;
    }
  }
}
</style>
