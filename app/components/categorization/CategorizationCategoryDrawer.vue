<template>
  <AppDrawer v-model="open" :z-index="500" :title="$t('categorization.picker.title')">

    <p class="ccd__hint">{{ $t('categorization.picker.hint') }}</p>

    <FormCategorySelector
      v-model:type="type"
      v-model:category="category"
      v-model:category-id="categoryId"
      v-model:subcategory="subcategory"
      v-model:subcategory-id="subcategoryId"
    />

    <button
      class="ccd__apply"
      :disabled="!category"
      @click="apply"
    >
      {{ $t('categorization.picker.apply') }}
    </button>

  </AppDrawer>
</template>

<script setup lang="ts">
import type { TransactionType } from '~/types'

const open = defineModel<boolean>({ required: true })

const props = defineProps<{
  initialType?:          TransactionType
  initialCategory?:      string
  initialCategoryId?:    string
  initialSubcategory?:   string
  initialSubcategoryId?: string
}>()

const emit = defineEmits<{
  apply: [category: string, type: TransactionType]
}>()

const type          = ref<TransactionType>('depense')
const category      = ref('')
const categoryId    = ref('')
const subcategory   = ref('')
const subcategoryId = ref('')

// (Ré)initialise à chaque ouverture en repartant de la sélection courante
// (type + catégorie + sous-catégorie) pour pouvoir l'ajuster, et pas seulement
// d'un type « dépense » vide.
watch(open, (v) => {
  if (v) {
    type.value          = props.initialType ?? 'depense'
    category.value      = props.initialCategory ?? ''
    categoryId.value    = props.initialCategoryId ?? ''
    subcategory.value   = props.initialSubcategory ?? ''
    subcategoryId.value = props.initialSubcategoryId ?? ''
  }
})

function apply() {
  if (!category.value) return
  const effectiveCategory = subcategoryId.value || categoryId.value
  if (!effectiveCategory) return
  emit('apply', effectiveCategory, type.value)
  open.value = false
}
</script>

<style scoped lang="scss">
.ccd {
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
