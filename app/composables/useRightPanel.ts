import { ref, computed } from 'vue'

// Singleton : profondeur de panneaux droits ouverts sur desktop
const panelDepth = ref(0)

export function useRightPanel() {
  const isOpen = computed(() => panelDepth.value > 0)

  function push()  { panelDepth.value++ }
  function pop()   { panelDepth.value = Math.max(0, panelDepth.value - 1) }
  function reset() { panelDepth.value = 0 }

  return { isOpen, push, pop, reset }
}
