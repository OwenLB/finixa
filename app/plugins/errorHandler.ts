import { useToast } from '~/composables/useToast'

export default defineNuxtPlugin((nuxtApp) => {
  const { show } = useToast()

  nuxtApp.hook('vue:error', (err, _instance, info) => {
    console.error('[Vue Error]', info, err)
    show('Une erreur inattendue s\'est produite', { type: 'error' })
  })

  // Les promesses non attendues (watchers async, `void store.fetch()`)
  // n'atteignent jamais vue:error — sans ce handler elles échouent en silence.
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Rejection]', event.reason)
    show('Une erreur inattendue s\'est produite', { type: 'error' })
  })
})
