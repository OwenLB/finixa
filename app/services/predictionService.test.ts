import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchLabelSuggestions } from './predictionService'

function stubClient(rows: unknown) {
  const rpc = vi.fn(async () => ({ data: rows, error: null }))
  return { client: { rpc } as unknown as SupabaseClient, rpc }
}

describe('fetchLabelSuggestions', () => {
  it('retourne [] sans appeler la RPC si la requête fait moins de 2 caractères', async () => {
    const { client, rpc } = stubClient([])
    expect(await fetchLabelSuggestions(client, 'a')).toEqual([])
    expect(await fetchLabelSuggestions(client, '  ')).toEqual([])
    expect(rpc).not.toHaveBeenCalled()
  })

  it('mappe les lignes RPC en LabelSuggestion et trim la requête', async () => {
    const { client, rpc } = stubClient([{ label: 'Café', type: 'depense', category: 'Restaurants' }])
    const out = await fetchLabelSuggestions(client, '  caf ')
    expect(out).toEqual([{ label: 'Café', type: 'depense', category: 'Restaurants' }])
    expect(rpc).toHaveBeenCalledWith('get_label_suggestions', { p_query: 'caf' })
  })

  it('tolère un retour data null → []', async () => {
    const { client } = stubClient(null)
    expect(await fetchLabelSuggestions(client, 'caf')).toEqual([])
  })
})
