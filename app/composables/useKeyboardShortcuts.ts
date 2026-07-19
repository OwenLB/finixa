/**
 * Raccourcis clavier desktop.
 * À appeler dans un composant desktop-only (ex: AppSidebar).
 *
 * N       → nouvelle transaction (/add)
 * /       → page transactions (pour recherche)
 * Escape  → géré directement par AppDrawer sur chaque instance
 */
export function useKeyboardShortcuts() {
  const { isDesktop } = useBreakpoint()
  const route         = useRoute()
  const addPanel      = useAddPanel()

  function isInputFocused(): boolean {
    const el = document.activeElement
    if (!el) return false
    const tag = el.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable
  }

  function onKeydown(e: KeyboardEvent) {
    if (!isDesktop.value)          return
    if (isInputFocused())          return
    if (e.metaKey || e.ctrlKey)    return

    // N — nouvelle transaction (ouvre le panneau sur desktop)
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault()
      addPanel.openAdd()
      return
    }

    // / — aller à la recherche transactions
    if (e.key === '/' && route.path !== '/transactions') {
      e.preventDefault()
      navigateTo('/transactions')
    }
  }

  onMounted(()   => document.addEventListener('keydown', onKeydown))
  onUnmounted(() => document.removeEventListener('keydown', onKeydown))
}
