import type { TransactionForm } from '~/types'
import { fetchLabelSuggestions } from '~/services/predictionService'
import type { LabelSuggestion } from '~/services/predictionService'

export function useLabelSuggestions(form: TransactionForm) {
  const supabase    = useSupabaseClient()
  const suggestions = ref<LabelSuggestion[]>([])

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let requestId = 0

  function onInput() {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (form.label.length < 2) {
      suggestions.value = []
      return
    }
    debounceTimer = setTimeout(async () => {
      const currentId = ++requestId
      const results = await fetchLabelSuggestions(supabase, form.label)
      if (currentId === requestId) suggestions.value = results
    }, 300)
  }

  function clear() {
    suggestions.value = []
    if (debounceTimer) clearTimeout(debounceTimer)
    requestId++
  }

  return { suggestions, onInput, clear }
}
