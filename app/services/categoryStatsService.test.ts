import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchSubcategoryStats } from './categoryStatsService'

describe('fetchSubcategoryStats', () => {
  it('construit une Map id→{spent,count} en coerçant les nombres', async () => {
    const client = {
      rpc: vi.fn(async () => ({ data: [{ subcategory_id: 's1', spent: '12.5', tx_count: '3' }], error: null })),
    } as unknown as SupabaseClient

    const map = await fetchSubcategoryStats(client, '2026-06')
    expect(map.get('s1')).toEqual({ spent: 12.5, count: 3 })
  })

  it('propage le message d’erreur de la RPC', async () => {
    const client = {
      rpc: vi.fn(async () => ({ data: null, error: { message: 'boom' } })),
    } as unknown as SupabaseClient

    await expect(fetchSubcategoryStats(client, '2026-06')).rejects.toThrow('boom')
  })

  it('transmet le dateRange (p_start/p_end) quand il est fourni', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }))
    const client = { rpc } as unknown as SupabaseClient

    await fetchSubcategoryStats(client, '2026-06', { start: '2026-06-01', end: '2026-06-30' })
    expect(rpc).toHaveBeenCalledWith('get_subcategory_stats', {
      p_month: '2026-06', p_start: '2026-06-01', p_end: '2026-06-30',
    })
  })
})
