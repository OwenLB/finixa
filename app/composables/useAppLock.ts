import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { App } from '@capacitor/app'

const GRACE_MS = 5 * 60_000 // 5 minutes

export function useAppLock() {
  const pinStore = usePinStore()

  function shouldLock(): boolean {
    if (!pinStore.enabled) return false
    const unlockedAt = sessionStorage.getItem('finixa-unlocked-at')
    if (!unlockedAt) return true
    const hiddenAt = sessionStorage.getItem('finixa-hidden-at')
    if (!hiddenAt) return false
    return Date.now() - Number(hiddenAt) > GRACE_MS
  }

  function markHidden() {
    sessionStorage.setItem('finixa-hidden-at', String(Date.now()))
  }

  function onForeground() {
    if (shouldLock()) pinStore.lock()
  }

  function onVisibilityChange() {
    if (document.hidden) markHidden()
    else onForeground()
  }

  let appStateHandle: PluginListenerHandle | null = null

  onMounted(async () => {
    if (shouldLock()) pinStore.lock()

    if (Capacitor.isNativePlatform()) {
      // visibilitychange ne se déclenche pas de façon fiable en WKWebView
      // quand l'app passe en background — appStateChange oui.
      appStateHandle = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) onForeground()
        else markHidden()
      })
    } else {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    appStateHandle?.remove()
  })
}
