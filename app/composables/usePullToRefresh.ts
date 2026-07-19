import type { Ref } from 'vue'

export const PTR_THRESHOLD   = 50
export const PTR_INDICATOR_H = 56
const RESISTANCE = 0.5

export function usePullToRefresh(elRef: Ref<HTMLElement | null>, onRefresh: () => Promise<void>) {
  const pullY      = ref(0)
  const refreshing = ref(false)
  const animate    = ref(false)

  let startY       = 0
  let active       = false
  let scrollParent: HTMLElement | null = null

  function findScrollParent(el: HTMLElement): HTMLElement | null {
    let node: HTMLElement | null = el.parentElement
    while (node) {
      const { overflowY } = getComputedStyle(node)
      if (overflowY === 'auto' || overflowY === 'scroll') return node
      node = node.parentElement
    }
    return null
  }

  function onTouchStart(e: TouchEvent) {
    if (refreshing.value) return
    if (!scrollParent || scrollParent.scrollTop > 0) return
    startY        = e.touches[0].clientY
    active        = true
    animate.value = false
  }

  function onTouchMove(e: TouchEvent) {
    if (!active || refreshing.value) return
    if (scrollParent && scrollParent.scrollTop > 0) {
      active      = false
      pullY.value = 0
      return
    }
    const dy = e.touches[0].clientY - startY
    // Ne s'engager dans le PTR qu'après 10px vers le bas — évite de bloquer
    // un scroll normal qui commence avec un léger mouvement descendant
    if (dy < 10) return
    e.preventDefault()
    pullY.value = Math.min((dy - 10) * RESISTANCE, PTR_INDICATOR_H)
  }

  async function onTouchEnd() {
    if (!active) return
    active = false
    const current = pullY.value
    animate.value = true
    await nextTick()

    if (current < PTR_THRESHOLD) {
      pullY.value = 0
      return
    }

    pullY.value      = PTR_INDICATOR_H
    refreshing.value = true
    try {
      await onRefresh()
    } finally {
      refreshing.value = false
      pullY.value      = 0
    }
  }

  onMounted(() => {
    const el = elRef.value
    if (!el) return
    scrollParent = findScrollParent(el)
    const target = scrollParent ?? el
    target.addEventListener('touchstart', onTouchStart, { passive: true })
    target.addEventListener('touchmove',  onTouchMove,  { passive: false })
    target.addEventListener('touchend',   onTouchEnd,   { passive: true })
  })

  onUnmounted(() => {
    const target = scrollParent ?? elRef.value
    if (!target) return
    target.removeEventListener('touchstart', onTouchStart)
    target.removeEventListener('touchmove',  onTouchMove)
    target.removeEventListener('touchend',   onTouchEnd)
    scrollParent = null
  })

  return { pullY, refreshing, animate }
}
