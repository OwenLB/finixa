export interface ContextMenuItem {
  label: string
  icon:  object
  action: () => void | Promise<void>
  danger?: boolean
}

const state = reactive({
  visible: false,
  items:   [] as ContextMenuItem[],
  anchorY: 0,
})

export function useContextMenu() {
  function show(items: ContextMenuItem[], anchorY: number) {
    state.items   = items
    state.anchorY = anchorY
    state.visible = true
  }

  function hide() {
    state.visible = false
  }

  return { state: readonly(state), show, hide }
}
