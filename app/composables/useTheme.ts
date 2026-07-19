import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

export type Theme = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'finixa-theme'

const theme = ref<Theme>('system')

let mql: MediaQueryList | null = null

function applyToDOM(value: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', value)
}

function onSystemChange(e: MediaQueryListEvent) {
  applyToDOM(e.matches ? 'dark' : 'light')
}

async function saveTheme(value: Theme) {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: STORAGE_KEY, value })
  } else {
    localStorage.setItem(STORAGE_KEY, value)
  }
}

async function loadTheme(): Promise<Theme | null> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: STORAGE_KEY })
    return (value as Theme | null)
  }
  return localStorage.getItem(STORAGE_KEY) as Theme | null
}

async function setTheme(value: Theme) {
  theme.value = value
  if (!import.meta.client) return

  await saveTheme(value)
  mql?.removeEventListener('change', onSystemChange)
  mql = null

  if (value === 'system') {
    mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener('change', onSystemChange)
    applyToDOM(mql.matches ? 'dark' : 'light')
  } else {
    applyToDOM(value)
  }
}

async function initTheme() {
  if (!import.meta.client) return
  const saved = await loadTheme()
  await setTheme(saved ?? 'system')
}

const isDark = computed(() => theme.value === 'dark')

export function useTheme() {
  return { theme: readonly(theme), isDark, setTheme, initTheme }
}
