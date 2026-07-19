import type { SupabaseClient } from '@supabase/supabase-js'

export interface EnvelopeConfig {
  needsPct:   number
  wantsPct:   number
  savingsPct: number
}

export async function fetchEnvelope(
  client: SupabaseClient,
  userId: string,
): Promise<EnvelopeConfig | null> {
  const { data, error } = await client
    .from('budget_envelopes')
    .select('needs_pct, wants_pct, savings_pct')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return { needsPct: data.needs_pct, wantsPct: data.wants_pct, savingsPct: data.savings_pct }
}

export async function upsertEnvelope(
  client: SupabaseClient,
  userId: string,
  config: EnvelopeConfig,
): Promise<void> {
  const { error } = await client
    .from('budget_envelopes')
    .upsert({
      user_id:     userId,
      needs_pct:   config.needsPct,
      wants_pct:   config.wantsPct,
      savings_pct: config.savingsPct,
      updated_at:  new Date().toISOString(),
    })
  if (error) throw new Error(error.message)
}
