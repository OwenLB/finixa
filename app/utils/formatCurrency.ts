const fmtCache = new Map<string, Intl.NumberFormat>()
const amtCache = new Map<string, Intl.NumberFormat>()

function getFmt(currency: string, locale: string) {
  const key = `${locale}|${currency}`
  if (!fmtCache.has(key))
    fmtCache.set(key, new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }))
  return fmtCache.get(key)!
}

function getAmtFmt(currency: string, locale: string) {
  const key = `${locale}|${currency}`
  if (!amtCache.has(key))
    amtCache.set(key, new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2 }))
  return amtCache.get(key)!
}

/** Formate un montant sans décimales : 1 234 € (séparateurs selon la locale active) */
export function formatCurrency(value: number, currency = 'EUR', locale = 'fr-FR'): string {
  return getFmt(currency, locale).format(value)
}

/** Formate un montant signé avec décimales : +1 234,50 € / -42,00 € / 0,00 € */
export function formatAmount(value: number, currency = 'EUR', locale = 'fr-FR'): string {
  const formatted = getAmtFmt(currency, locale).format(Math.abs(value))
  // 0 ne reçoit pas de signe
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatted}`
}
