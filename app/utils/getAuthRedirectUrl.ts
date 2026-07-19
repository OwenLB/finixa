import { Capacitor } from '@capacitor/core'

/**
 * Returns the correct redirect URL for Supabase auth emails.
 * In a native Capacitor context, uses the custom URL scheme so
 * the OS can route the deep link back to the app.
 * In a web context, uses the current origin WITH the hash prefix : le router
 * est en hashMode (`/#/confirm`), donc un chemin réel `/confirm` ne chargerait
 * jamais la route sur hébergement statique (le hash est vide → redirige vers `/`).
 * confirm.vue lit ensuite ?token_hash=…&type=… via route.query (parsé dans le hash).
 */
export function getAuthRedirectUrl(path: string): string {
  if (Capacitor.isNativePlatform()) {
    return `com.finixa.app://auth${path}`
  }
  return `${window.location.origin}/#${path}`
}
