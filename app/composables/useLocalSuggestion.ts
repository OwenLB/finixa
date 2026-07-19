/**
 * Suggestion de catégorie locale (synchrone) — scanne les transactions du mois
 * courant en mémoire pour trouver la sous-catégorie la plus fréquente.
 *
 * Note : la suggestion DB sur l'historique complet est gérée en bulk par
 * useCategorizationQueue (chargée une seule fois à l'entrée du workflow).
 */
import { computed, type Ref } from 'vue'
import { useTransactionStore } from '~/stores/useTransactionStore'
import type { TransactionType } from '~/types'

export interface LocalSuggestion {
  category: string   // UUID de la sous-catégorie
  type:     TransactionType
}

export function useLocalSuggestion(txName: Ref<string>) {
  const store = useTransactionStore()

  const suggestion = computed((): LocalSuggestion | null => {
    const query = txName.value.trim().toLowerCase()
    if (query.length < 2) return null

    const freq = new Map<string, { count: number; type: TransactionType }>()
    for (const tx of store.transactions) {
      if (!tx.categorized || !tx.category || tx.virtual) continue
      const name = tx.name.toLowerCase()
      if (!(name.includes(query) || query.includes(name))) continue
      const entry = freq.get(tx.category)
      if (entry) entry.count++
      else freq.set(tx.category, { count: 1, type: tx.type })
    }

    if (!freq.size) return null
    let best: { category: string; count: number; type: TransactionType } | null = null
    for (const [category, { count, type }] of freq) {
      if (!best || count > best.count) best = { category, count, type }
    }
    return best ? { category: best.category, type: best.type } : null
  })

  return { suggestion }
}
