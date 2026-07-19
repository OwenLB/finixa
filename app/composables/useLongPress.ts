export function useLongPress(
  callback: (e: PointerEvent) => void,
  options: { delay?: number; moveThreshold?: number } = {},
) {
  const { delay = 500, moveThreshold = 8 } = options

  let timerId: ReturnType<typeof setTimeout> | null = null
  let startX = 0
  let startY = 0
  const triggered = ref(false)

  function onPointerDown(e: PointerEvent) {
    startX = e.clientX
    startY = e.clientY
    triggered.value = false
    const captured = e
    timerId = setTimeout(() => {
      triggered.value = true
      callback(captured)
    }, delay)
  }

  function onPointerMove(e: PointerEvent) {
    if (timerId === null) return
    const dx = Math.abs(e.clientX - startX)
    const dy = Math.abs(e.clientY - startY)
    if (dx > moveThreshold || dy > moveThreshold) cancel()
  }

  function cancel() {
    if (timerId !== null) {
      clearTimeout(timerId)
      timerId = null
    }
  }

  function reset() {
    cancel()
    triggered.value = false
  }

  return { triggered, onPointerDown, onPointerMove, cancel, reset }
}
