<template>
  <AppDrawer
    v-model="isOpen"
    :title="editingRecurring ? $t('recurring.editTitle') : $t('recurring.addTitle')"
  >
    <template v-if="form">
      <div class="rfd__form">
        <TransactionForm :form="form" recurring-only />
      </div>

      <AppButton :disabled="loading || !form.amount" @click="save">
        <Check :size="20" />
        {{ editingRecurring ? $t('edit.submit') : $t('add.submit') }}
      </AppButton>

      <AppButton v-if="editingRecurring" variant="danger" :disabled="loading" @click="confirmDelete">
        <Trash2 :size="16" />
        {{ $t('edit.delete') }}
      </AppButton>
    </template>
  </AppDrawer>
</template>

<script setup lang="ts">
import { Check, Trash2 } from 'lucide-vue-next'
import type { RecurringExpense, TransactionForm as TxForm } from '~/types'
import { useRecurringStore }   from '~/stores/useRecurringStore'
import { useTransactionStore } from '~/stores/useTransactionStore'
import { useCategoryStore }    from '~/stores/useCategoryStore'
import { useToast }            from '~/composables/useToast'
import { resolveCategory }     from '~/utils/category'
import { todayLocalISO }       from '~/utils/localDate'

const props = defineProps<{
  modelValue:       boolean
  editingRecurring: RecurringExpense | null
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const { t }            = useI18n()
const recurringStore   = useRecurringStore()
const transactionStore = useTransactionStore()
const categoryStore    = useCategoryStore()
const toast            = useToast()
const loading          = ref(false)
const today            = todayLocalISO()

const form = ref<TxForm | null>(null)

watch(isOpen, (open) => {
  if (!open) return
  const rec = props.editingRecurring
  if (rec) {
    const resolved = resolveCategory(rec.category, rec.type, categoryStore.categories)
    form.value = reactive<TxForm>({
      amount:           Math.abs(rec.amount),
      label:            rec.name,
      note:             '',
      date:             rec.startDate,   // date originale affichée ; le save() calcule l'ancre en interne
      accountingDate:   '',
      recurring:        true,
      frequency:        rec.frequency,
      recurringEndDate: rec.endDate ?? '',
      accountingOffset: rec.accountingOffset,
      type:             rec.type,
      category:         resolved.category,
      categoryId:       resolved.categoryId,
      subcategory:      resolved.subcategory,
      subcategoryId:    resolved.subcategoryId,
      horsBudget:       false,
    })
  } else {
    form.value = reactive<TxForm>({
      amount:           0,
      label:            '',
      note:             '',
      date:             today,
      accountingDate:   '',
      recurring:        true,
      frequency:        'monthly',
      recurringEndDate: '',
      accountingOffset: 'same_month',
      type:             'depense',
      category:         '',
      categoryId:       '',
      subcategory:      '',
      subcategoryId:    '',
      horsBudget:       false,
    })
  }
})

async function save() {
  if (!form.value || !form.value.amount || loading.value) return
  loading.value = true
  try {
    if (props.editingRecurring) {
      // L'ancre (mois courant + jour d'origine) est calculée ici, pas exposée dans le form
      const rec     = props.editingRecurring
      const dom     = parseInt(rec.startDate.slice(8, 10))
      const now     = new Date()
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const anchor  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.min(dom, lastDay)).padStart(2, '0')}`
      await transactionStore.updateRecurringDefinition(props.editingRecurring.id, { ...form.value, date: anchor })
      toast.show(t('toast.recurringUpdated'))
    } else {
      await recurringStore.add(form.value)
      await transactionStore.fetch()
      toast.show(t('toast.recurringAdded'))
    }
    isOpen.value = false
  } catch {
    toast.show(t('toast.error'), { sub: t('toast.recurringError'), type: 'error' })
  } finally {
    loading.value = false
  }
}

async function confirmDelete() {
  if (!props.editingRecurring || loading.value) return
  if (!confirm(t('edit.confirmDelete', { name: props.editingRecurring.name }))) return
  loading.value = true
  try {
    await recurringStore.remove(props.editingRecurring.id)
    toast.show(t('toast.recurringDeleted'), { type: 'info' })
    await transactionStore.fetch()
    isOpen.value = false
  } catch {
    toast.show(t('toast.error'), { sub: t('toast.recurringError'), type: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.rfd__form {
  margin: 0 (-$page-padding-x);
  display: flex;
  flex-direction: column;
}
</style>
