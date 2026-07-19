import type { SupabaseClient } from '@supabase/supabase-js'
import type { Theme } from '~/composables/useTheme'

export interface UserPreferences {
  theme:                        Theme
  currency:                     string
  locale:                       string
  onboarding_completed:         boolean
  envelope_feature_enabled:     boolean
  accounting_period_start_day:  number
}

// Maps navigator.language → currency. Falls back to EUR.
const CURRENCY_BY_LANG: Record<string, string> = {
  'fr-FR': 'EUR', 'fr-BE': 'EUR', 'fr-LU': 'EUR', 'fr-MC': 'EUR',
  'de-DE': 'EUR', 'de-AT': 'EUR', 'es-ES': 'EUR', 'it-IT': 'EUR',
  'fr-CH': 'CHF', 'de-CH': 'CHF', 'it-CH': 'CHF',
  'en-US': 'USD', 'en-CA': 'CAD',
  'en-GB': 'GBP',
  'ja-JP': 'JPY', 'zh-CN': 'CNY',
}

export function detectDefaultPreferences(): UserPreferences {
  const lang   = navigator.language ?? 'fr-FR'
  const locale = lang.startsWith('fr') ? 'fr' : 'en'
  const currency = CURRENCY_BY_LANG[lang]
    ?? CURRENCY_BY_LANG[`${lang.split('-')[0]}-${lang.split('-')[0].toUpperCase()}`]
    ?? 'EUR'
  return { theme: 'system', currency, locale, onboarding_completed: false, envelope_feature_enabled: false, accounting_period_start_day: 1 }
}

export async function fetchPreferences(
  client: SupabaseClient,
  userId: string,
): Promise<UserPreferences | null> {
  const { data, error } = await client
    .from('user_preferences')
    .select('theme, currency, locale, onboarding_completed, envelope_feature_enabled, accounting_period_start_day')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return {
    theme:                        data.theme as Theme,
    currency:                     data.currency,
    locale:                       data.locale,
    onboarding_completed:         data.onboarding_completed ?? false,
    envelope_feature_enabled:     data.envelope_feature_enabled ?? false,
    accounting_period_start_day:  data.accounting_period_start_day ?? 1,
  }
}

export async function upsertPreferences(
  client: SupabaseClient,
  userId: string,
  prefs: Partial<UserPreferences>,
): Promise<void> {
  const { error } = await client
    .from('user_preferences')
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}
