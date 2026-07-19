import { defineStore } from 'pinia'
import { fetchEnvelope, upsertEnvelope, type EnvelopeConfig } from '~/services/envelopeService'
import { getSessionUserId } from '~/utils/auth'

export const ENVELOPE_COLORS = {
  needs:   '#f97316',
  wants:   '#a855f7',
  savings: '#14b8a6',
} as const


export const useEnvelopeStore = defineStore('envelopes', () => {
  const supabase = useSupabaseClient()
  const user     = useSupabaseUser()

  const needsPct   = ref(50)
  const wantsPct   = ref(30)
  const savingsPct = ref(20)
  const loaded     = ref(false)
  const error      = ref<string | null>(null)

  async function fetch() {
    // user.value peut être transitoirement défini sans id pendant un refresh de
    // token — sans cette garde, on requêtait budget_envelopes avec
    // user_id=eq.undefined (400 « invalid input syntax for type uuid »).
    const userId = user.value?.id
    if (!userId) return
    error.value = null
    try {
      const config = await fetchEnvelope(supabase, userId)
      if (config) {
        needsPct.value   = config.needsPct
        wantsPct.value   = config.wantsPct
        savingsPct.value = config.savingsPct
      }
      loaded.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des enveloppes'
    }
  }

  async function save(config: EnvelopeConfig) {
    needsPct.value   = config.needsPct
    wantsPct.value   = config.wantsPct
    savingsPct.value = config.savingsPct
    try {
      const userId = await getSessionUserId(supabase)
      await upsertEnvelope(supabase, userId, config)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la sauvegarde des enveloppes'
      throw e
    }
  }

  function amountsFor(income: number) {
    return {
      needs:   Math.round(income * needsPct.value   / 100),
      wants:   Math.round(income * wantsPct.value   / 100),
      savings: Math.round(income * savingsPct.value / 100),
    }
  }

  return { needsPct, wantsPct, savingsPct, loaded, error, fetch, save, amountsFor }
})
