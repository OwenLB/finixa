export function useHaptics() {
  function impact(style: 'light' | 'medium' | 'heavy' = 'medium') {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return
    navigator.vibrate(style === 'light' ? 10 : style === 'medium' ? 20 : 40)
  }

  function selection() {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return
    navigator.vibrate(8)
  }

  function notification(type: 'success' | 'warning' | 'error' = 'success') {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return
    navigator.vibrate(
      type === 'success' ? [10, 30, 10] :
      type === 'warning' ? [20, 50, 20] :
                           [30, 50, 30, 50, 30]
    )
  }

  return { impact, selection, notification }
}
