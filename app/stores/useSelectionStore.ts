import { defineStore } from 'pinia'

export const useSelectionStore = defineStore('selection', () => {
  const active      = ref(false)
  const selectedIds = ref<string[]>([])

  const count = computed(() => selectedIds.value.length)

  function enter() {
    active.value = true
  }

  function exit() {
    active.value      = false
    selectedIds.value = []
  }

  function toggle(id: string) {
    const i = selectedIds.value.indexOf(id)
    if (i >= 0) selectedIds.value.splice(i, 1)
    else         selectedIds.value.push(id)
  }

  function isSelected(id: string) {
    return selectedIds.value.includes(id)
  }

  function selectAll(ids: string[]) {
    selectedIds.value = [...ids]
  }

  function clear() {
    selectedIds.value = []
  }

  return { active, count, selectedIds, enter, exit, toggle, isSelected, selectAll, clear }
})
