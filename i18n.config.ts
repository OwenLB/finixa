import fr from './i18n/fr'
import en from './i18n/en'

export default () => ({
  legacy:         false,
  locale:         'fr',
  fallbackLocale: 'fr',
  messages:       { fr, en },
})
