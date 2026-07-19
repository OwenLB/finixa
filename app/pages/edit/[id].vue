<template>
  <div class="edit">
    <PageHeader :title="$t('edit.title')">
      <template #actions>
        <button class="edit__back" :aria-label="$t('common.close')" @click="router.back()">
          <X :size="18" />
        </button>
      </template>
    </PageHeader>

    <TransactionForm v-if="form" :form="form" :is-editing="true" />

    <div class="edit__footer">
      <AppButton
        :disabled="!form || (!form.amount && !form.label.trim())"
        :loading="submitting"
        @click="submit"
      >
        <Check :size="20" />
        {{ $t('edit.submit') }}
      </AppButton>
      <AppButton variant="danger" @click="confirmDelete">
        <Trash2 :size="16" />
        {{ $t('edit.delete') }}
      </AppButton>
    </div>

    <RecurringScopeSheet v-model="scopeSheetOpen" @choose="applyEdit" />
  </div>
</template>

<script setup lang="ts">
import { X, Check, Trash2 } from 'lucide-vue-next'
import AppButton from '~/components/AppButton.vue'
import RecurringScopeSheet from '~/components/transactions/RecurringScopeSheet.vue'
import { useTransactionStore } from '~/stores/useTransactionStore'
import { useCategoryStore }    from '~/stores/useCategoryStore'
import { useRecurringStore }   from '~/stores/useRecurringStore'
import type { TransactionForm as TxForm } from '~/types'
import { useToast }            from '~/composables/useToast'
import { resolveCategory }     from '~/utils/category'

const { t }          = useI18n()
const route          = useRoute()
const router         = useRouter()
const store          = useTransactionStore()
const catStore       = useCategoryStore()
const recurringStore = useRecurringStore()
const toast     = useToast()

const id = route.params.id as string
const tx = store.getById(id)

if (!tx) {
  router.replace('/transactions')
}

const isRecurring   = !!(tx?.virtual && tx?.recurringId)
const originalRec = isRecurring
  ? recurringStore.recurringExpenses.find(r => r.id === tx?.recurringId)
  : null

const resolved = tx ? resolveCategory(tx.category, tx.type, catStore.categories) : { category: '', categoryId: '', subcategory: '', subcategoryId: '' }

const form = tx ? reactive<TxForm>({
  amount:           Math.abs(tx.amount),
  label:            tx.name,
  note:             tx.note ?? '',
  date:             tx.date.slice(0, 10),
  accountingDate:   tx.accountingDate ?? '',
  recurring:        isRecurring,
  frequency:        originalRec?.frequency ?? 'monthly',
  recurringEndDate: originalRec?.endDate ?? '',
  accountingOffset: originalRec?.accountingOffset ?? 'same_month',
  type:             tx.type as TxForm['type'],
  category:         resolved.category,
  categoryId:       resolved.categoryId,
  subcategory:      resolved.subcategory,
  subcategoryId:    resolved.subcategoryId,
  horsBudget:       tx.horsBudget ?? false,
}) : null

// Si les catégories n'étaient pas chargées au moment du setup (race condition au démarrage),
// on re-résout la sous-catégorie dès qu'elles deviennent disponibles.
if (form && tx && !resolved.subcategoryId) {
  watchEffect(() => {
    if (!catStore.categories.length || form.subcategoryId) return
    const r = resolveCategory(tx.category, tx.type, catStore.categories)
    if (!r.subcategoryId) return
    form.category      = r.category
    form.categoryId    = r.categoryId
    form.subcategory   = r.subcategory
    form.subcategoryId = r.subcategoryId
  })
}

async function confirmDelete() {
  if (!confirm(t('edit.confirmDelete', { name: tx?.name }))) return
  try {
    if (isRecurring && tx) {
      await store.deleteRecurringOccurrence(tx)
    } else {
      await store.remove(id)
    }
    toast.show(t('toast.txDeleted'), { sub: tx?.name, type: 'info' })
    router.replace('/transactions')
  } catch {
    toast.show(t('toast.error'), { sub: t('toast.txDeleteError'), type: 'error' })
  }
}

const submitting     = ref(false)
const scopeSheetOpen = ref(false)

function submit() {
  if (submitting.value) return
  if (!form || (!form.amount && !form.label.trim())) return
  // Récurrente : demander le périmètre (cette occurrence / toutes les futures)
  if (isRecurring && tx) { scopeSheetOpen.value = true; return }
  void applyEdit()
}

async function applyEdit(scope?: 'occurrence' | 'future') {
  if (submitting.value || !form) return
  submitting.value = true
  scopeSheetOpen.value = false
  try {
    if (scope && isRecurring && tx) {
      await store.updateRecurringOccurrence(tx, { ...form }, scope)
    } else {
      await store.update(id, { ...form })
    }
    toast.show(t('toast.txUpdated'), { sub: form.label || form.category || t('transaction.fallback') })
    router.back()
  } catch {
    toast.show(t('toast.error'), { sub: t('toast.txUpdateError'), type: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.edit {
  display: flex;
  flex-direction: column;
  min-height: 100%;

  &__back {
    width: 36px;
    height: 36px;
    border-radius: 99px;
    background: var(--color-bg-elevated);
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__footer {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px $page-padding-x;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }
}
</style>
