export function useBreakpoint() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 0)

  const isMobile  = computed(() => width.value < 768)
  const isTablet  = computed(() => width.value >= 768 && width.value < 1024)
  const isDesktop = computed(() => width.value >= 1024)

  onMounted(() => {
    width.value = window.innerWidth
    const onResize = () => { width.value = window.innerWidth }
    window.addEventListener('resize', onResize)
    onUnmounted(() => window.removeEventListener('resize', onResize))
  })

  return { width, isMobile, isTablet, isDesktop }
}
