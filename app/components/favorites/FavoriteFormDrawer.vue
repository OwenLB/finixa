<template>
  <AppDrawer v-model="open" :title="editing ? $t('favorites.editTitle') : $t('favorites.drawerTitle')">

    <AppFormField :label="$t('favorites.name')">
      <input
        v-model="name"
        class="ffd__input"
        type="text"
        :placeholder="$t('favorites.namePlaceholder')"
      />
    </AppFormField>

    <AppFormField :label="$t('form.amount')">
      <input
        v-model.number="amount"
        class="ffd__input"
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
      />
    </AppFormField>

    <FormCategorySelector
      v-model:type="type"
      v-model:category="category"
      v-model:subcategory="subcategory"
    />

    <button
      class="ffd__save"
      :disabled="!name.trim() || !amount"
      @click="save"
    >
      {{ $t('favorites.save') }}
    </button>

    <AppButton v-if="editing" variant="danger" @click="deleteFav">
      {{ $t('edit.delete') }}
    </AppButton>

  </AppDrawer>
</template>

<script setup lang="ts">
import type { Favorite, TransactionType } from '~/types'
import { useFavoriteStore } from '~/stores/useFavoriteStore'
import { useToast } from '~/composables/useToast'

const open = defineModel<boolean>({ required: true })

const props = defineProps<{
  prefill?: {
    name:        string
    amount:      number
    type:        TransactionType
    category:    string
    subcategory: string
  }
  editing?: Favorite | null
}>()

const emit = defineEmits<{ saved: [] }>()

const { t }  = useI18n()
const store  = useFavoriteStore()
const toast  = useToast()

const name        = ref('')
const amount      = ref<number>(0)
const type        = ref<TransactionType>('depense')
const category    = ref('')
const subcategory = ref('')

watch(open, (v) => {
  if (!v) return
  const src = props.editing ?? props.prefill
  if (src) {
    name.value        = src.name
    amount.value      = Math.abs(src.amount)
    type.value        = src.type
    category.value    = src.category
    subcategory.value = src.subcategory
  } else {
    name.value        = ''
    amount.value      = 0
    type.value        = 'depense'
    category.value    = ''
    subcategory.value = ''
  }
})

async function deleteFav() {
  if (!confirm(t('favorites.deleteConfirm'))) return
  await store.remove(props.editing!.id)
  toast.show(t('favorites.toast.deleted'), { type: 'success' })
  open.value = false
}

async function save() {
  if (!name.value.trim() || !amount.value) return
  const data = {
    name:        name.value.trim(),
    amount:      type.value === 'revenu' ? Math.abs(amount.value) : -Math.abs(amount.value),
    type:        type.value,
    category:    category.value,
    subcategory: subcategory.value,
  }
  if (props.editing) {
    await store.update(props.editing.id, data)
    toast.show(t('favorites.toast.updated'), { type: 'success' })
  } else {
    await store.add(data)
    toast.show(t('favorites.toast.added'), { type: 'success' })
  }
  emit('saved')
  open.value = false
}
</script>

<style scoped lang="scss">
.ffd {
  &__input {
    width: 100%;
    background: var(--color-bg-elevated);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: 13px 14px;
    font-size: 14px;
    color: var(--color-text-primary);
    outline: none;
    transition: border-color $transition-fast;

    &::placeholder { color: var(--color-text-muted); }
    &:focus { border-color: var(--color-accent); }
  }

  &__save {
    @include btn-action;

    &:disabled {
      opacity: 0.35;
      pointer-events: none;
    }
  }

}
</style>
