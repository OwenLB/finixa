/**
 * Sur desktop, intercepte la navigation vers /add et /edit/:id
 * pour ouvrir le panneau latéral au lieu de charger la page.
 */
export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.server) return

  if (typeof window === 'undefined' || window.innerWidth < 1024) return

  if (to.path === '/add') {
    const { openAdd } = useAddPanel()
    openAdd()
    return navigateTo(from.path || '/')
  }

  const editMatch = to.path.match(/^\/edit\/(.+)$/)
  if (editMatch) {
    const { openEdit } = useAddPanel()
    openEdit(editMatch[1])
    return navigateTo(from.path || '/')
  }
})
