import type { SupabaseClient } from '@supabase/supabase-js'
import type { TransactionType } from '~/types'

export interface LabelSuggestion {
  label:    string
  type:     TransactionType
  category: string   // nom de la sous-catégorie (convention du projet)
}

export async function fetchLabelSuggestions(
  client: SupabaseClient,
  query: string,
): Promise<LabelSuggestion[]> {
  if (query.trim().length < 2) return []
  const { data } = await client.rpc('get_label_suggestions', { p_query: query.trim() })
  return (data ?? []).map((r: Record<string, string>) => ({
    label:    r.label,
    type:     r.type as TransactionType,
    category: r.category,
  }))
}
