<template>
  <AppDrawer v-model="open" :title="title">
    <!-- ── Mode ajout ─────────────────────────────────────────── -->
    <template v-if="mode === 'add'">
      <TransactionForm
        ref="addFormRef"
        :form="addForm"
        @open-favorites="pickerOpen = true"
      />
      <div class="panel-footer">
        <button
          class="panel-footer__fav"
          :class="{ 'panel-footer__fav--active': canSaveAsFavorite }"
          @click="onFavBtnClick"
        >
          <Star :size="15" :fill="canSaveAsFavorite ? 'currentColor' : 'none'" />
          {{ canSaveAsFavorite ? $t('favorites.saveAs') : $t('favorites.addToFavorites') }}
        </button>
        <AppButton
          :disabled="!addForm.amount && !addForm.label.trim()"
          :loading="submitting"
          @click="submitAdd"
        >
          {{ $t('add.submit') }}
        </AppButton>
      </div>
    </template>

    <!-- ── Mode édition ───────────────────────────────────────── -->
    <template v-else-if="mode === 'edit' && editForm">
      <TransactionForm :form="editForm" />
      <div class="panel-footer">
        <AppButton
          :disabled="!editForm.amount && !editForm.label.trim()"
          :loading="submitting"
          @click="submitEdit"
        >
          <Check :size="20" />
          {{ $t('edit.submit') }}
        </AppButton>
        <AppButton variant="danger" @click="confirmDelete">
          <Trash2 :size="16" />
          {{ $t('edit.delete') }}
        </AppButton>
      </div>
    </template>
  </AppDrawer>

  <!-- Sub-drawers (téléportés indépendamment) -->
  <FavoritesPickerDrawer v-model="pickerOpen" @apply="applyFavorite" />
  <RecurringScopeSheet v-model="scopeSheetOpen" @choose="applyEdit" />
</template>

<script setup lang="ts">
import { Star, Check, Trash2 } from 'lucide-vue-next'
import AppButton               from '~/components/AppButton.vue'
import RecurringScopeSheet     from '~/components/transactions/RecurringScopeSheet.vue'
import { useTransactionStore } from '~/stores/useTransactionStore'
import { useCategoryStore }    from '~/stores/useCategoryStore'
import { useFavoriteStore }    from '~/stores/useFavoriteStore'
import { useRecurringStore }   from '~/stores/useRecurringStore'
import type { TransactionForm as TxForm, Favorite } from '~/types'
import { useToast }            from '~/composables/useToast'
import { todayLocalISO }       from '~/utils/localDate'
import { resolveCategory }     from '~/utils/category'

const { t }          = useI18n()
const store          = useTransactionStore()
const catStore       = useCategoryStore()
const favStore       = useFavoriteStore()
const recurringStore = useRecurringStore()
const toast     = useToast()
const { fmt }   = useCurrency()

const { open, editId, close } = useAddPanel()

const mode  = computed(() => (editId.value === null ? 'add' : 'edit'))
const title = computed(() => t(mode.value === 'add' ? 'add.title' : 'edit.title'))

// ── Mode ajout ────────────────────────────────────────────────────
function createDefaultAddForm(): TxForm {
  return {
    amount: 0, label: '', note: '',
    date: todayLocalISO(),
    accountingDate: '',
    recurring: false, frequency: 'monthly', recurringEndDate: '',
    accountingOffset: 'same_month',
    type: 'depense', category: '', categoryId: '', subcategory: '', subcategoryId: '',
    horsBudget: false,
  }
}

const addForm      = reactive<TxForm>(createDefaultAddForm())
const addFormRef   = ref<{ resetSearch: () => void }>()
const pickerOpen   = ref(false)

const canSaveAsFavorite = computed(() =>
  !!addForm.label.trim() && !!addForm.amount && !!(addForm.subcategory || addForm.category)
)

function onFavBtnClick() {
  if (canSaveAsFavorite.value) saveAsFavorite()
  else pickerOpen.value = true
}

async function saveAsFavorite() {
  await favStore.add({
    name: addForm.label.trim(),
    amount: addForm.type === 'revenu' ? Math.abs(addForm.amount) : -Math.abs(addForm.amount),
    type: addForm.type,
    category: addForm.category,
    subcategory: addForm.subcategory,
  })
  toast.show(t('favorites.toast.added'), { type: 'success' })
}

function applyFavorite(fav: Favorite) {
  addForm.label        = fav.name
  addForm.amount       = Math.abs(fav.amount)
  addForm.type         = fav.type
  addForm.category     = fav.category
  addForm.subcategory  = fav.subcategory
  const cat = catStore.byType(fav.type).find(c => c.name === fav.category)
  addForm.categoryId    = cat?.id ?? ''
  addForm.subcategoryId = cat?.subcategories.find(s => s.name === fav.subcategory)?.id ?? ''
}

const submitting = ref(false)

async function submitAdd() {
  if (submitting.value) return
  if (!addForm.amount && !addForm.label.trim()) return
  const label = addForm.label || addForm.category || t('transaction.fallback')
  submitting.value = true
  try {
    await store.add({ ...addForm })
    toast.show(t('toast.txAdded'), { sub: `${label} · ${fmt(addForm.amount)}` })
    addFormRef.value?.resetSearch()
    Object.assign(addForm, createDefaultAddForm())
  } catch {
    toast.show(t('toast.error'), { sub: t('toast.txAddError'), type: 'error' })
  } finally {
    submitting.value = false
  }
}

// ── Mode édition ──────────────────────────────────────────────────
const editForm    = ref<TxForm | null>(null)
const isRecurring = ref(false)
let   currentTxId = ''

watch([open, editId], () => {
  if (!open.value || editId.value === null) {
    editForm.value = null
    return
  }
  const tx = store.getById(editId.value)
  if (!tx) {
    close()
    return
  }
  currentTxId     = tx.id
  isRecurring.value = !!(tx.virtual && tx.recurringId)
  const originalRec = isRecurring.value
    ? recurringStore.recurringExpenses.find(r => r.id === tx.recurringId)
    : null
  const resolved  = resolveCategory(tx.category, tx.type, catStore.categories)
  editForm.value  = reactive<TxForm>({
    amount:           Math.abs(tx.amount),
    label:            tx.name,
    note:             tx.note ?? '',
    date:             tx.date.slice(0, 10),
    accountingDate:   tx.accountingDate ?? '',
    recurring:        isRecurring.value,
    frequency:        originalRec?.frequency ?? 'monthly',
    recurringEndDate: originalRec?.endDate ?? '',
    accountingOffset: originalRec?.accountingOffset ?? 'same_month',
    type:             tx.type as TxForm['type'],
    category:         resolved.category,
    categoryId:       resolved.categoryId,
    subcategory:      resolved.subcategory,
    subcategoryId:    resolved.subcategoryId,
    horsBudget:       tx.horsBudget ?? false,
  })
}, { immediate: true })

// Si les catégories n'étaient pas chargées quand le panneau s'est ouvert (race condition),
// on re-résout la sous-catégorie dès qu'elles deviennent disponibles.
watchEffect(() => {
  if (!editForm.value || !editId.value) return
  if (editForm.value.subcategoryId) return
  if (!catStore.categories.length) return
  const tx = store.getById(editId.value)
  if (!tx) return
  const r = resolveCategory(tx.category, tx.type, catStore.categories)
  if (!r.subcategoryId) return
  editForm.value.category      = r.category
  editForm.value.categoryId    = r.categoryId
  editForm.value.subcategory   = r.subcategory
  editForm.value.subcategoryId = r.subcategoryId
})

const scopeSheetOpen = ref(false)

function submitEdit() {
  if (submitting.value) return
  if (!editForm.value || (!editForm.value.amount && !editForm.value.label.trim())) return
  // Récurrente : demander le périmètre (cette occurrence / toutes les futures)
  // au lieu de réécrire silencieusement toute la définition.
  if (isRecurring.value) { scopeSheetOpen.value = true; return }
  void applyEdit()
}

async function applyEdit(scope?: 'occurrence' | 'future') {
  if (submitting.value || !editForm.value) return
  const tx = store.getById(currentTxId)
  submitting.value = true
  scopeSheetOpen.value = false
  try {
    if (scope && tx) {
      await store.updateRecurringOccurrence(tx, { ...editForm.value }, scope)
    } else {
      await store.update(currentTxId, { ...editForm.value })
    }
    toast.show(t('toast.txUpdated'), {
      sub: editForm.value.label || editForm.value.category || t('transaction.fallback'),
    })
    close()
  } catch {
    toast.show(t('toast.error'), { sub: t('toast.txUpdateError'), type: 'error' })
  } finally {
    submitting.value = false
  }
}

async function confirmDelete() {
  const tx = store.getById(currentTxId)
  if (!tx) return
  if (!confirm(t('edit.confirmDelete', { name: tx.name }))) return
  try {
    if (isRecurring.value && tx) {
      await store.deleteRecurringOccurrence(tx)
    } else {
      await store.remove(currentTxId)
    }
    toast.show(t('toast.txDeleted'), { sub: tx.name, type: 'info' })
    close()
  } catch {
    toast.show(t('toast.error'), { sub: t('toast.txDeleteError'), type: 'error' })
  }
}

onMounted(() => favStore.fetch())
</script>

<style scoped lang="scss">
.panel-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;

  &__fav {
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

    &--active { color: #f59e0b; }
    &:active  { opacity: 0.65; }
  }
}
</style>
