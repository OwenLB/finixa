export interface Toast {
  id:       number
  message:  string
  sub?:     string
  type:     'success' | 'error' | 'info'
  duration: number
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
  function show(message: string, options?: { sub?: string; type?: Toast['type']; duration?: number }) {
    const id = nextId++
    const duration = options?.duration ?? 3000
    toasts.value.push({ id, message, sub: options?.sub, type: options?.type ?? 'success', duration })
    setTimeout(() => dismiss(id), duration)
  }

  function dismiss(id: number) {
    const i = toasts.value.findIndex(t => t.id === id)
    if (i !== -1) toasts.value.splice(i, 1)
  }

  return { toasts: readonly(toasts), show, dismiss }
}
