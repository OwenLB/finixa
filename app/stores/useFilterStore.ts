import { defineStore } from 'pinia'
import type { TransactionType } from '~/types'

export const useFilterStore = defineStore('txFilter', () => {
  const types         = ref<TransactionType[]>([])
  const categories    = ref<string[]>([])
  const subcategories = ref<string[]>([])
  const status        = ref<'' | 'checked' | 'pending'>('')
  const uncategorized = ref(false)
  const recurring     = ref<boolean | null>(null)

  const activeCount = computed(() =>
    types.value.length +
    categories.value.length +
    subcategories.value.length +
    (status.value ? 1 : 0) +
    (uncategorized.value ? 1 : 0) +
    (recurring.value !== null ? 1 : 0)
  )

  function toggleType(type: TransactionType) {
    const idx = types.value.indexOf(type)
    if (idx === -1) types.value.push(type)
    else types.value.splice(idx, 1)
  }

  function toggleCategory(name: string) {
    const idx = categories.value.indexOf(name)
    if (idx === -1) {
      categories.value.push(name)
    } else {
      categories.value.splice(idx, 1)
      // Remove subcategories that belong to this category if no other selected cat has them
      // (handled in drawer via visibleSubcategories)
    }
  }

  function toggleSubcategory(name: string) {
    const idx = subcategories.value.indexOf(name)
    if (idx === -1) subcategories.value.push(name)
    else subcategories.value.splice(idx, 1)
  }

  function reset() {
    types.value         = []
    categories.value    = []
    subcategories.value = []
    status.value        = ''
    uncategorized.value = false
    recurring.value     = null
  }

  return {
    types, categories, subcategories, status, uncategorized, recurring,
    activeCount, toggleType, toggleCategory, toggleSubcategory, reset,
  }
})
