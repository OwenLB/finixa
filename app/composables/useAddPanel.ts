import { ref } from 'vue'

// Singleton — état du panneau ajout/édition sur desktop
const open   = ref(false)
const editId = ref<string | null>(null)

export function useAddPanel() {
  function openAdd() {
    editId.value = null
    open.value   = true
  }

  function openEdit(id: string) {
    editId.value = id
    open.value   = true
  }

  function close() {
    open.value = false
  }

  return { open, editId, openAdd, openEdit, close }
}
