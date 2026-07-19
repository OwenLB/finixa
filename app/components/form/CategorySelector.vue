<template>
  <AppFormField :label="t('form.searchCategory')">
    <FormCategorySearchInput ref="searchRef" @select="onSearchSelect" />
  </AppFormField>

  <div class="cat-selector__dropdowns">
    <div class="cat-selector__group">
      <span class="cat-selector__label">{{ t('form.type') }}</span>
      <FormSelectInput
        v-model="type"
        :label="t('form.type')"
        :options="typeOptions"
        @change="onTypeChange"
      />
    </div>
    <div class="cat-selector__group">
      <span class="cat-selector__label">{{ t('form.category') }}</span>
      <FormSelectInput
        v-model="category"
        :label="t('form.category')"
        :options="availableCategories"
        placeholder="—"
        @change="onCategoryChange"
      />
    </div>
    <div class="cat-selector__group">
      <span class="cat-selector__label">{{ t('form.subcategory') }}</span>
      <FormSelectInput
        v-model="subcategory"
        :label="t('form.subcategoryFull')"
        :options="availableSubcategories"
        placeholder="—"
        @change="onSubcategoryChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { TRANSACTION_TYPES }   from '~/types'
import type { TransactionType } from '~/types'
import { useCategoryStore }    from '~/stores/useCategoryStore'
import type { CategorySelection } from '~/components/form/CategorySearchInput.vue'

const type          = defineModel<TransactionType>('type',          { required: true })
const category      = defineModel<string>         ('category',      { required: true })
const categoryId    = defineModel<string>         ('categoryId',    { default: '' })
const subcategory   = defineModel<string>         ('subcategory',   { required: true })
const subcategoryId = defineModel<string>         ('subcategoryId', { default: '' })

const { t }         = useI18n()
const categoryStore = useCategoryStore()
const searchRef     = ref<{ reset: () => void }>()

const typeOptions = computed(() =>
  TRANSACTION_TYPES.map(opt => ({ value: opt.value, label: t(`types.${opt.value}`) }))
)

const availableCategories = computed(() =>
  categoryStore.byType(type.value).map(c => ({ value: c.name, label: c.name }))
)

const availableSubcategories = computed(() => {
  if (!category.value) return []
  const cat = categoryStore.byType(type.value).find(c => c.name === category.value)
  return cat?.subcategories.map(s => ({ value: s.name, label: s.name })) ?? []
})

function findSubId(catName: string, subName: string): string {
  const cat = categoryStore.byType(type.value).find(c => c.name === catName)
  return cat?.subcategories.find(s => s.name === subName)?.id ?? ''
}

function onSearchSelect(sel: CategorySelection) {
  type.value          = sel.type
  category.value      = sel.category
  const cat           = categoryStore.byType(sel.type).find(c => c.name === sel.category)
  categoryId.value    = cat?.id ?? ''
  subcategory.value   = sel.subcategory
  subcategoryId.value = cat?.subcategories.find(s => s.name === sel.subcategory)?.id ?? ''
}

function onTypeChange() {
  category.value      = ''
  categoryId.value    = ''
  subcategory.value   = ''
  subcategoryId.value = ''
}

function onCategoryChange(newCat: string) {
  const cat           = categoryStore.byType(type.value).find(c => c.name === newCat)
  categoryId.value    = cat?.id ?? ''
  subcategory.value   = ''
  subcategoryId.value = ''
}

function onSubcategoryChange(newSub: string) {
  subcategoryId.value = findSubId(category.value, newSub)
}

function reset() {
  searchRef.value?.reset()
}

defineExpose({ reset })
</script>

<style scoped lang="scss">
.cat-selector {
  &__dropdowns {
    display: flex;
    gap: 10px;
  }

  &__group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__label {
    @include label-caps;
  }
}
</style>
