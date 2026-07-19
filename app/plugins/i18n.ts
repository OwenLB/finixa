import fr from '../../i18n/fr'
import en from '../../i18n/en'

export default defineNuxtPlugin({
  enforce: 'post',
  setup(nuxtApp) {
    const i18n = nuxtApp.$i18n as { setLocaleMessage: (locale: string, messages: unknown) => void }
    i18n.setLocaleMessage('fr', fr)
    i18n.setLocaleMessage('en', en)
  },
})
