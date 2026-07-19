/**
 * Gestion des swipe gestures via Pointer Events.
 *
 * Important : setPointerCapture n'est appelé qu'après un mouvement horizontal
 * significatif (minDrag px) pour ne pas intercepter les clics sur les éléments enfants.
 */
export function useSwipe(options: { threshold?: number; minDrag?: number } = {}) {
  const { threshold = 80, minDrag = 10 } = options

  const deltaX     = ref(0)
  const isDragging = ref(false)  // vrai seulement quand le drag est confirmé

  let isTracking = false  // vrai depuis pointerdown jusqu'à pointerup
  let startX     = 0
  let startY     = 0
  let pointerId  = -1
  let captured   = false  // setPointerCapture a été appelé

  function onPointerDown(e: PointerEvent) {
    startX     = e.clientX
    startY     = e.clientY
    pointerId  = e.pointerId
    isTracking = true
    captured   = false
  }

  function onPointerMove(e: PointerEvent) {
    if (!isTracking || e.pointerId !== pointerId) return

    const dx = e.clientX - startX
    const dy = e.clientY - startY

    // Ne capturer qu'après un mouvement clairement horizontal
    if (!captured && Math.abs(dx) > minDrag && Math.abs(dx) > Math.abs(dy)) {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      captured         = true
      isDragging.value = true
    }

    if (captured) {
      deltaX.value = dx
    }
  }

  /**
   * Retourne :
   * - 'right' / 'left' si le seuil est dépassé
   * - null si le drag n'a pas atteint le seuil (snap back)
   * - 'tap' si aucun drag n'a été détecté (simple tap)
   */
  function onPointerUp(e: PointerEvent): 'right' | 'left' | 'tap' | null {
    if (!isTracking || e.pointerId !== pointerId) return null

    isTracking = false

    if (!captured) {
      // Simple tap : pas de drag détecté
      isDragging.value = false
      return 'tap'
    }

    isDragging.value = false
    captured         = false
    const delta      = deltaX.value

    if (delta > threshold)  return 'right'
    if (delta < -threshold) return 'left'

    deltaX.value = 0
    return null
  }

  function reset() {
    deltaX.value     = 0
    isDragging.value = false
    isTracking       = false
    captured         = false
  }

  return { deltaX, isDragging, onPointerDown, onPointerMove, onPointerUp, reset }
}
