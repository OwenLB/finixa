<template>
  <div class="add">
    <PageHeader :title="$t('add.title')" />

    <TransactionForm ref="formRef" :form="form" @open-favorites="pickerOpen = true" />

    <div class="add__footer">
      <button
        class="add__save-fav"
        :class="{ 'add__save-fav--active': canSaveAsFavorite }"
        @click="onFavoriteBtnClick"
      >
        <Star :size="15" :fill="canSaveAsFavorite ? 'currentColor' : 'none'" />
        {{ canSaveAsFavorite ? $t('favorites.saveAs') : $t('favorites.addToFavorites') }}
      </button>
      <AppButton
        :disabled="!form.amount && !form.label.trim()"
        :loading="submitting"
        @click="submit"
      >
        {{ $t('add.submit') }}
      </AppButton>
    </div>
  </div>

  <FavoritesPickerDrawer v-model="pickerOpen" @apply="applyFavorite" />
</template>

<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import { useTransactionStore } from '~/stores/useTransactionStore'
import { useFavoriteStore }    from '~/stores/useFavoriteStore'
import { useCategoryStore }    from '~/stores/useCategoryStore'
import type { TransactionForm as TxForm, Favorite } from '~/types'
import { useToast } from '~/composables/useToast'
import { todayLocalISO } from '~/utils/localDate'

const { t }      = useI18n()
const store      = useTransactionStore()
const favStore   = useFavoriteStore()
const catStore   = useCategoryStore()
const toast   = useToast()
const { fmt } = useCurrency()
const formRef    = ref<{ resetSearch: () => void }>()
const pickerOpen = ref(false)

function createDefaultForm(): TxForm {
  return {
    amount:           0,
    label:            '',
    note:             '',
    date:             todayLocalISO(),
    accountingDate:   '',
    recurring:        false,
    frequency:        'monthly',
    recurringEndDate: '',
    accountingOffset: 'same_month',
    type:             'depense',
    category:         '',
    categoryId:       '',
    subcategory:      '',
    subcategoryId:    '',
    horsBudget:       false,
  }
}

const form = reactive<TxForm>(createDefaultForm())

// Activé uniquement quand intitulé + montant + sous-catégorie (ou catégorie) sont renseignés
const canSaveAsFavorite = computed(() =>
  !!form.label.trim() && !!form.amount && !!(form.subcategory || form.category)
)

function onFavoriteBtnClick() {
  if (canSaveAsFavorite.value) saveAsFavorite()
  else pickerOpen.value = true
}

async function saveAsFavorite() {
  await favStore.add({
    name:        form.label.trim(),
    amount:      form.type === 'revenu' ? Math.abs(form.amount) : -Math.abs(form.amount),
    type:        form.type,
    category:    form.category,
    subcategory: form.subcategory,
  })
  toast.show(t('favorites.toast.added'), { type: 'success' })
}

function applyFavorite(fav: Favorite) {
  form.label         = fav.name
  form.amount        = Math.abs(fav.amount)
  form.type          = fav.type
  form.category      = fav.category
  form.subcategory   = fav.subcategory
  const cat = catStore.byType(fav.type).find(c => c.name === fav.category)
  form.categoryId    = cat?.id ?? ''
  form.subcategoryId = cat?.subcategories.find(s => s.name === fav.subcategory)?.id ?? ''
}

const submitting = ref(false)

async function submit() {
  if (submitting.value) return
  if (!form.amount && !form.label.trim()) return

  const label = form.label || form.category || t('transaction.fallback')
  submitting.value = true
  try {
    await store.add({ ...form })
    toast.show(t('toast.txAdded'), { sub: `${label} · ${fmt(form.amount)}` })
    formRef.value?.resetSearch()
    Object.assign(form, createDefaultForm())
  } catch {
    toast.show(t('toast.error'), { sub: t('toast.txAddError'), type: 'error' })
  } finally {
    submitting.value = false
  }
}

// Favoris déjà en cache après le premier passage : on ne refetch pas à chaque
// ouverture de la page d'ajout (la plus fréquentée).
onMounted(() => { if (!favStore.loaded) favStore.fetch() })
</script>

<style scoped lang="scss">
.add {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 100%;

  @media (min-width: $breakpoint-lg) {
    min-height: unset;
    max-width: 600px;
    margin: 0 auto;
    padding-bottom: 32px;
  }

  &__footer {
    position: sticky;
    bottom: 0;
    background: var(--color-bg);
    padding: 12px $page-padding-x;
    display: flex;
    flex-direction: column;
    gap: 10px;

    @media (min-width: $breakpoint-lg) {
      position: static;
      padding: 16px $page-padding-x 0;
    }
  }

  &__save-fav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 11px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    transition: opacity $transition-fast, color $transition-fast;

    &--active {
      color: #f59e0b;
    }

    &:active { opacity: 0.65; }
  }
}
</style>
