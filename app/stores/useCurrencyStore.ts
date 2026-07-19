import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const STORAGE_KEY = 'app-currency'

export const useCurrencyStore = defineStore('currency', () => {
  const currency = ref('EUR')

  async function loadCurrency() {
    if (!import.meta.client) return
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: STORAGE_KEY })
      currency.value = value ?? 'EUR'
    } else {
      currency.value = localStorage.getItem(STORAGE_KEY) ?? 'EUR'
    }
  }

  async function setCurrency(code: string) {
    currency.value = code
    if (!import.meta.client) return
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: STORAGE_KEY, value: code })
    } else {
      localStorage.setItem(STORAGE_KEY, code)
    }
  }

  return { currency, loadCurrency, setCurrency }
})
