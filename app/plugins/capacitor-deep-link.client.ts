import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

/**
 * Handles deep links for Supabase auth callbacks in native Capacitor context.
 * Supabase sends emails with com.finixa.app://auth/confirm?token=...
 * The OS opens the app and delivers the URL here.
 */
export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return

  const router = useRouter()
  const supabase = useSupabaseClient()

  App.addListener('appUrlOpen', async ({ url }) => {
    // e.g. com.finixa.app://auth/confirm#access_token=...&type=magiclink
    //      com.finixa.app://auth/reset-password#access_token=...&type=recovery
    const match = url.match(/com\.finixa\.app:\/\/auth(.*)/)
    if (!match) return

    const path = match[1] // e.g. "/confirm#access_token=..."

    // Extract fragment tokens set by Supabase PKCE
    const hash = path.includes('#') ? path.split('#')[1] : ''
    if (hash) {
      const params = new URLSearchParams(hash)
      const accessToken  = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      }
    }

    // Navigate to the path (strip fragment for hash router)
    const routePath = path.split('#')[0] || '/'
    await router.push(routePath)
  })
})
