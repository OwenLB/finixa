// Tests the double-tap-to-reset timing logic from PeriodSelector.vue.
// We test the algorithm directly (no component mount) because mounting the
// component pulls in usePeriodStore → usePreferencesStore → Supabase, which
// requires a live database connection even in the nuxt test environment.
//
// The algorithm in onLabelClick:
//   two clicks < 300ms apart  → store.set(todayKey) if not already there
//   gap >= 300ms              → open picker, no reset
//   double-tap on current month → no-op
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mirror of onLabelClick in PeriodSelector.vue (keep in sync).
// Le picker s'ouvre avec un délai de 310ms pour détecter le double tap.
function createDoubleTapHandler(
  getMonth:     () => string,
  getTodayKey:  () => string,
  setMonth:     (k: string) => void,
  openPicker:   () => void,
) {
  let lastLabelTap = 0
  let pickerOpenTimer: ReturnType<typeof setTimeout> | null = null

  return function onLabelClick() {
    const now = Date.now()
    if (now - lastLabelTap < 300) {
      lastLabelTap = 0
      if (pickerOpenTimer) { clearTimeout(pickerOpenTimer); pickerOpenTimer = null }
      if (getMonth() !== getTodayKey()) setMonth(getTodayKey())
      return
    }
    lastLabelTap = now
    if (pickerOpenTimer) clearTimeout(pickerOpenTimer)
    pickerOpenTimer = setTimeout(() => { pickerOpenTimer = null; openPicker() }, 310)
  }
}

describe('PeriodSelector — double tap label', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('premier clic ouvre le picker après 310ms', () => {
    const openPicker = vi.fn()
    const handler = createDoubleTapHandler(() => '2026-05', () => '2026-06', vi.fn(), openPicker)
    handler()
    expect(openPicker).not.toHaveBeenCalled()   // pas encore
    vi.advanceTimersByTime(310)
    expect(openPicker).toHaveBeenCalledTimes(1)
  })

  it('double clic < 300ms appelle store.set(todayKey) et ne rouvre pas le picker', () => {
    const setMonth   = vi.fn()
    const openPicker = vi.fn()
    const handler = createDoubleTapHandler(() => '2026-05', () => '2026-06', setMonth, openPicker)

    handler()
    vi.advanceTimersByTime(100)
    handler()
    vi.advanceTimersByTime(310) // le timer annulé ne doit pas déclencher l'ouverture

    expect(setMonth).toHaveBeenCalledWith('2026-06')
    expect(openPicker).not.toHaveBeenCalled()
  })

  it("deux clics séparés par > 300ms ne déclenchent pas le retour au mois en cours", () => {
    const setMonth = vi.fn()
    const handler = createDoubleTapHandler(() => '2026-05', () => '2026-06', setMonth, vi.fn())

    handler()
    vi.advanceTimersByTime(400)
    handler()

    expect(setMonth).not.toHaveBeenCalled()
  })

  it("double tap ne fait rien si on est déjà sur le mois en cours", () => {
    const setMonth = vi.fn()
    const handler = createDoubleTapHandler(() => '2026-06', () => '2026-06', setMonth, vi.fn())

    handler()
    vi.advanceTimersByTime(100)
    handler()

    expect(setMonth).not.toHaveBeenCalled()
  })
})
