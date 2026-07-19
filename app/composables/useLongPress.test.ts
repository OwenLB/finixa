import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLongPress } from './useLongPress'

function makePointerEvent(x = 0, y = 0): PointerEvent {
  return { clientX: x, clientY: y, pointerId: 1 } as PointerEvent
}

describe('useLongPress', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('fires callback after delay', () => {
    const cb = vi.fn()
    const lp = useLongPress(cb, { delay: 500 })
    lp.onPointerDown(makePointerEvent())
    expect(cb).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(cb).toHaveBeenCalledOnce()
    expect(lp.triggered.value).toBe(true)
  })

  it('does not fire if pointer moves beyond threshold', () => {
    const cb = vi.fn()
    const lp = useLongPress(cb, { delay: 500, moveThreshold: 8 })
    lp.onPointerDown(makePointerEvent(0, 0))
    lp.onPointerMove(makePointerEvent(20, 0))
    vi.advanceTimersByTime(500)
    expect(cb).not.toHaveBeenCalled()
    expect(lp.triggered.value).toBe(false)
  })

  it('does not fire if cancel is called before delay', () => {
    const cb = vi.fn()
    const lp = useLongPress(cb, { delay: 500 })
    lp.onPointerDown(makePointerEvent())
    lp.cancel()
    vi.advanceTimersByTime(500)
    expect(cb).not.toHaveBeenCalled()
  })

  it('fires within threshold movement', () => {
    const cb = vi.fn()
    const lp = useLongPress(cb, { delay: 500, moveThreshold: 8 })
    lp.onPointerDown(makePointerEvent(0, 0))
    lp.onPointerMove(makePointerEvent(4, 3))
    vi.advanceTimersByTime(500)
    expect(cb).toHaveBeenCalledOnce()
  })

  it('reset clears triggered state', () => {
    const cb = vi.fn()
    const lp = useLongPress(cb, { delay: 500 })
    lp.onPointerDown(makePointerEvent())
    vi.advanceTimersByTime(500)
    expect(lp.triggered.value).toBe(true)
    lp.reset()
    expect(lp.triggered.value).toBe(false)
  })
})
