import { useTheme, type Theme } from '~/composables/useTheme'
import { fetchPreferences, upsertPreferences, detectDefaultPreferences, type UserPreferences } from '~/services/preferenceService'

export const usePreferencesStore = defineStore('preferences', () => {
  const { setTheme } = useTheme()
  const currencyStore = useCurrencyStore()
  const supabase      = useSupabaseClient()
  const user          = useSupabaseUser()

  const userId                 = ref<string | null>(null)
  const onboardingCompleted     = ref(false)
  const envelopeFeatureEnabled  = ref(false)
  const periodStartDay          = ref(1)
  const error                   = ref<string | null>(null)

  function applyLocale(code: string) {
    const i18n = (useNuxtApp().$i18n) as { locale: { value: string } }
    i18n.locale.value = code
  }

  async function applyAll(prefs: { theme: Theme; currency: string; locale: string }) {
    await setTheme(prefs.theme)
    await currencyStore.setCurrency(prefs.currency)
    applyLocale(prefs.locale)
  }

  /**
   * Charge les préférences de l'utilisateur.
   * @returns true si la lecture a abouti (la valeur de onboardingCompleted est
   *          fiable), false si elle a échoué (réseau / auth). Dans ce cas il NE
   *          faut PAS se fier à onboardingCompleted (qui resterait à sa valeur
   *          par défaut `false`) — sinon on renverrait à tort vers l'onboarding.
   */
  async function fetch(): Promise<boolean> {
    if (!user.value?.id) return false
    const uid = user.value.id
    userId.value = uid
    error.value  = null

    // Lecture avec reprise : un échec transitoire (réseau, JWT en cours de
    // refresh) ne doit pas faire croire que l'onboarding n'est pas terminé.
    let prefs: UserPreferences | null = null
    let lastErr: unknown = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        prefs = await fetchPreferences(supabase, uid)
        lastErr = null
        break
      } catch (e) {
        lastErr = e
        if (attempt < 2) await new Promise(r => setTimeout(r, 300 * (attempt + 1)))
      }
    }

    if (lastErr) {
      error.value = lastErr instanceof Error ? lastErr.message : 'Erreur lors du chargement des préférences'
      return false
    }

    try {
      if (!prefs) {
        prefs = detectDefaultPreferences()
        // INSERT uniquement — ne jamais écraser une ligne existante
        await supabase
          .from('user_preferences')
          .insert({ user_id: uid, ...prefs, updated_at: new Date().toISOString() })
          .throwOnError()
          .then(() => {}, () => {}) // ignore conflict si la ligne existe déjà
      }

      onboardingCompleted.value    = prefs.onboarding_completed
      envelopeFeatureEnabled.value = prefs.envelope_feature_enabled
      periodStartDay.value         = prefs.accounting_period_start_day ?? 1
      await applyAll(prefs)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des préférences'
      return false
    }
  }

  async function completeOnboarding() {
    onboardingCompleted.value = true
    if (userId.value) {
      try {
        await upsertPreferences(supabase, userId.value, { onboarding_completed: true })
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Erreur lors de la finalisation de l\'onboarding'
      }
    }
  }

  async function setThemeAndSave(value: Theme) {
    await setTheme(value)
    if (userId.value) {
      try {
        await upsertPreferences(supabase, userId.value, { theme: value })
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Erreur lors de la sauvegarde du thème'
      }
    }
  }

  async function setCurrencyAndSave(code: string) {
    await currencyStore.setCurrency(code)
    if (userId.value) {
      try {
        await upsertPreferences(supabase, userId.value, { currency: code })
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Erreur lors de la sauvegarde de la devise'
      }
    }
  }

  async function setLocaleAndSave(code: string) {
    applyLocale(code)
    if (userId.value) {
      try {
        await upsertPreferences(supabase, userId.value, { locale: code })
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Erreur lors de la sauvegarde de la langue'
      }
    }
  }

  async function enableEnvelopeFeature() {
    envelopeFeatureEnabled.value = true
    if (userId.value) {
      try {
        await upsertPreferences(supabase, userId.value, { envelope_feature_enabled: true })
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Erreur lors de l\'activation des enveloppes'
      }
    }
  }

  async function disableEnvelopeFeature() {
    envelopeFeatureEnabled.value = false
    if (userId.value) {
      try {
        await upsertPreferences(supabase, userId.value, { envelope_feature_enabled: false })
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Erreur lors de la désactivation des enveloppes'
      }
    }
  }

  async function setPeriodStartDay(day: number) {
    periodStartDay.value = day
    if (userId.value) {
      try {
        await upsertPreferences(supabase, userId.value, { accounting_period_start_day: day })
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Erreur lors de la sauvegarde de la période'
      }
    }
  }

  return {
    fetch, onboardingCompleted, envelopeFeatureEnabled, periodStartDay, error,
    completeOnboarding,
    setTheme: setThemeAndSave, setCurrency: setCurrencyAndSave, setLocale: setLocaleAndSave,
    enableEnvelopeFeature, disableEnvelopeFeature,
    setPeriodStartDay,
  }
})
