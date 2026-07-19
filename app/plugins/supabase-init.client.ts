import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

/**
 * @nuxtjs/supabase uses supabase-ssr (createBrowserClient) with cookie-based storage.
 * - Web (incl. iOS PWA standalone): cookies may not reliably persist across kills
 *   → switch to localStorage.
 * - Native Capacitor: iOS can purge the WKWebView data store (localStorage included)
 *   under memory pressure → use @capacitor/preferences (app container, never purged).
 * In both cases we call refreshSession() so onAuthStateChange fires and
 * useSupabaseUser() is populated before the redirect middleware runs.
 */
export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient()
  // storageKey/storage sont des internes de GoTrueClient non exposés par les types
  const auth = supabase.auth as unknown as { storageKey?: string; storage: unknown }
  const storageKey: string = auth.storageKey ?? 'finixa-auth'
  const isNative = Capacitor.isNativePlatform()

  let raw: string | null = null

  if (isNative) {
    // GoTrueClient supports async storage adapters
    auth.storage = {
      getItem:    async (key: string) => (await Preferences.get({ key })).value,
      setItem:    async (key: string, value: string) => { await Preferences.set({ key, value }) },
      removeItem: async (key: string) => { await Preferences.remove({ key }) },
    }

    raw = (await Preferences.get({ key: storageKey })).value

    // Migration : session encore en localStorage (ancienne version de l'app)
    if (!raw) {
      const legacy = window.localStorage.getItem(storageKey)
      if (legacy) {
        await Preferences.set({ key: storageKey, value: legacy })
        window.localStorage.removeItem(storageKey)
        raw = legacy
      }
    }
  } else {
    // localStorage persists reliably in iOS PWA standalone mode
    auth.storage = window.localStorage
    raw = window.localStorage.getItem(storageKey)
  }

  if (!raw) return

  try {
    const stored = JSON.parse(raw)
    if (stored?.refresh_token) {
      // refreshSession fires onAuthStateChange → useSupabaseUser() gets updated
      await supabase.auth.refreshSession({ refresh_token: stored.refresh_token })
    }
  } catch {
    // Stored session is invalid or corrupted — clear it
    if (isNative) await Preferences.remove({ key: storageKey })
    else window.localStorage.removeItem(storageKey)
  }
})
