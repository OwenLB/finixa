import { defineStore } from 'pinia'
import { addMonths, getPeriodBounds, currentPeriodKey } from '~/utils/period'

export const usePeriodStore = defineStore('period', () => {
  const { locale }       = useI18n()
  const preferencesStore = usePreferencesStore()

  const periodStartDay = computed(() => preferencesStore.periodStartDay ?? 1)

  const todayKey = computed(() => currentPeriodKey(periodStartDay.value))

  const mode  = ref<'month' | 'year'>('month')
  const month = ref(currentPeriodKey(periodStartDay.value))
  const year  = ref(Number(month.value.slice(0, 4)))

  // Quand le jour de début change, on revient sur la période en cours
  watch(periodStartDay, (day) => {
    month.value = currentPeriodKey(day)
    year.value  = Number(month.value.slice(0, 4))
  })

  const canGoNext = computed(() => true)

  const label = computed(() => {
    if (mode.value === 'year') return String(year.value)
    const [y, m] = month.value.split('-').map(Number)

    if (periodStartDay.value <= 1) {
      return new Date(y, m - 1).toLocaleDateString(locale.value, { month: 'long', year: 'numeric' })
    }

    const daysInStartMonth = new Date(y, m, 0).getDate()
    const daysInA  = daysInStartMonth - periodStartDay.value + 1
    const daysInB  = periodStartDay.value - 1
    const minority = Math.min(daysInA, daysInB)

    // Afficher 2 mois si les 2 côtés ont au moins 8 jours chacun
    if (minority >= 8) {
      const dateA    = new Date(y, m - 1)
      const dateB    = new Date(y, m)
      const crossYear = dateA.getFullYear() !== dateB.getFullYear()
      if (crossYear) {
        const fmtA = dateA.toLocaleDateString(locale.value, { month: 'short', year: 'numeric' })
        const fmtB = dateB.toLocaleDateString(locale.value, { month: 'short', year: 'numeric' })
        return `${fmtA} / ${fmtB}`
      }
      const shortA = dateA.toLocaleDateString(locale.value, { month: 'short' })
      const longB  = dateB.toLocaleDateString(locale.value, { month: 'long', year: 'numeric' })
      return `${shortA} / ${longB}`
    }

    // Sinon afficher uniquement le mois dominant
    return (daysInA >= daysInB ? new Date(y, m - 1) : new Date(y, m))
      .toLocaleDateString(locale.value, { month: 'long', year: 'numeric' })
  })

  // Sous-label affiché quand la période n'est pas calendaire (ex: "25 mars – 24 avr.")
  const periodRangeLabel = computed(() => {
    if (periodStartDay.value <= 1 || mode.value === 'year') return null
    const { start, end } = dateRange.value
    const startDate = new Date(start + 'T12:00:00')
    const endDate   = new Date(end   + 'T12:00:00')
    endDate.setDate(endDate.getDate() - 1)
    const fmt = (d: Date) => d.toLocaleDateString(locale.value, { day: 'numeric', month: 'short' })
    return `${fmt(startDate)} – ${fmt(endDate)}`
  })

  const dateRange = computed(() => {
    if (mode.value === 'year') {
      return {
        start: `${year.value}-01-01`,
        end:   `${year.value + 1}-01-01`,
      }
    }
    return getPeriodBounds(periodStartDay.value, month.value)
  })

  function prev() {
    if (mode.value === 'year') { year.value--; return }
    month.value = addMonths(month.value, -1)
  }

  function next() {
    if (!canGoNext.value) return
    if (mode.value === 'year') { year.value++; return }
    month.value = addMonths(month.value, +1)
  }

  function set(key: string) {
    month.value = key
  }

  function setMode(m: 'month' | 'year') {
    mode.value = m
    if (m === 'year') year.value = Number(month.value.slice(0, 4))
  }

  function getDateRangeFor(key: string) {
    return getPeriodBounds(periodStartDay.value, key)
  }

  return { month, year, mode, label, periodRangeLabel, todayKey, canGoNext, dateRange, prev, next, set, setMode, getDateRangeFor }
})
