// Devises supportées — partagé entre les réglages (AppearanceSection) et
// l'onboarding (étape Bases). Le libellé est traduit via `currencies.<code>`.
export const CURRENCY_FLAGS: Record<string, string> = {
  EUR: '🇪🇺', USD: '🇺🇸', GBP: '🇬🇧', CHF: '🇨🇭',
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'CHF',
}

export const CURRENCY_CODES = Object.keys(CURRENCY_FLAGS)

