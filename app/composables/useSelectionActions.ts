import { useSelectionStore }   from '~/stores/useSelectionStore'
import { useTransactionStore } from '~/stores/useTransactionStore'
import { useToast }            from '~/composables/useToast'
import type { TransactionType } from '~/types'

// Singletons — partagés entre toutes les instances (toolbar desktop + barre mobile)
const categorizeOpen = ref(false)
const loading        = ref(false)

export function useSelectionActions() {
  const selectionStore   = useSelectionStore()
  const transactionStore = useTransactionStore()
  const toast            = useToast()
  const { t }            = useI18n()

  // Filtre les virtuels (non persistés en DB)
  function realIds() {
    return selectionStore.selectedIds.filter(
      id => !transactionStore.getById(id)?.virtual,
    )
  }

  async function pointer() {
    if (loading.value) return
    loading.value = true
    try {
      const ids       = realIds()
      const newStatus = await transactionStore.bulkToggleStatus(ids)
      selectionStore.exit()
      toast.show(
        newStatus === 'checked'
          ? t('selection.toast.pointed',   { count: ids.length })
          : t('selection.toast.unpointed', { count: ids.length }),
        { type: newStatus === 'checked' ? 'success' : 'info' },
      )
    } catch {
      toast.show(t('toast.error'), { type: 'error' })
    } finally {
      loading.value = false
    }
  }

  async function remove() {
    if (loading.value) return
    loading.value = true
    try {
      const ids = realIds()
      await transactionStore.bulkRemove(ids)
      selectionStore.exit()
      toast.show(t('selection.toast.deleted', { count: ids.length }))
    } catch {
      toast.show(t('toast.error'), { type: 'error' })
    } finally {
      loading.value = false
    }
  }

  function openCategorize() {
    categorizeOpen.value = true
  }

  async function applyCategorize(category: string, categorized: boolean, type: TransactionType) {
    if (loading.value) return
    loading.value = true
    try {
      const ids = realIds()
      await transactionStore.bulkSetCategory(ids, category, categorized, type)
      categorizeOpen.value = false
      selectionStore.exit()
      toast.show(t('selection.toast.categorized', { count: ids.length }))
    } catch {
      toast.show(t('toast.error'), { type: 'error' })
    } finally {
      loading.value = false
    }
  }

  return { categorizeOpen, loading, pointer, remove, openCategorize, applyCategorize }
}
