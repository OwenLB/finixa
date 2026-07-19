export function useCurrency() {
  const store = useCurrencyStore()
  const { locale } = useI18n()

  const fmt       = (value: number) => formatCurrency(value, store.currency, locale.value)
  const fmtAmount = (value: number) => formatAmount(value, store.currency, locale.value)

  return { fmt, fmtAmount }
}
